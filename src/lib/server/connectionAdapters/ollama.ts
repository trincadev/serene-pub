import Handlebars from "handlebars"
import { FormatNames } from "$lib/shared/constants/FormatNames";
import _ from "lodash";

export class GenerateBlock {
    static chatmlOpen(role: string) { return `<|im_start|>${role}\n\n`; }
    static chatmlClose = "<|im_end|>\n";
    static basicOpen(role: string) { return `*** ${role}\n\n`; }
    static basicClose = "\n\n";
    static vicunaOpen(role: string) { return `### ${_.capitalize(role)}:\n\n`; }
    static vicunaClose = "\n";
    static openaiOpen(role: string) { return `<|${role}|>\n\n`; }
    static openaiClose = "\n";

    static makeBlock({ format, role, content, includeClose = true }: { format: typeof FormatNames.OPTION, role: string, content: string, includeClose?: boolean }) {
        switch (format) {
            case FormatNames.ChatML:
                return this.chatmlOpen(role) + content + (includeClose ? this.chatmlClose : "");
            case FormatNames.Basic:
                return this.basicOpen(role) + content + (includeClose ? this.basicClose : "");
            case FormatNames.Vicuna:
                return this.vicunaOpen(role) + content + (includeClose ? this.vicunaClose : "");
            case FormatNames.OpenAI:
                return this.openaiOpen(role) + content + (includeClose ? this.openaiClose : "");
            default:
                return this.chatmlOpen(role) + content + (includeClose ? this.chatmlClose : "");
        }
    }
}

export function applyStopStrings(response: string, stopStrings: string[], context?: Record<string, string>): string {
    let earliestIndex = response.length;
    for (const stop of stopStrings) {
        let stopStr = stop;
        if (context && stopStr.includes("{{")) {
            // Use Handlebars to render stop string with context
            stopStr = Handlebars.compile(stopStr)(context);
        }
        // Escape for regex if needed
        const regex = new RegExp(stopStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "m");
        const match = response.match(regex);
        if (match && match.index !== undefined && match.index < earliestIndex) {
            earliestIndex = match.index;
        }
    }
    return response.slice(0, earliestIndex);
}

export class OllamaAdapter {
    connection: SelectConnection
    weights: SelectWeights
    contextConfig: SelectContextConfig
    promptConfig: SelectPromptConfig
    chat: SelectChat & {
        chatCharacters?: SelectChatCharacter & { character: SelectCharacter }[]
        chatPersonas?: SelectChatPersona & { persona: SelectPersona }[]
        chatMessages: SelectChatMessage[]
    }
    constructor({
        connection,
        weights,
        contextConfig,
        promptConfig,
        chat
    }: {
        connection: SelectConnection
        weights: SelectWeights
        contextConfig: SelectContextConfig
        promptConfig: SelectPromptConfig
        chat: SelectChat & {
            chatCharacters?: SelectChatCharacter & { character: SelectCharacter }[]
            chatPersonas?: SelectChatPersona & { persona: SelectPersona }[]
            chatMessages: SelectChatMessage[]
        }
    }) {
        this.contextConfig = contextConfig || { template: "" }
        this.connection = connection
        this.weights = weights
        this.promptConfig = promptConfig || { systemPrompt: "" }
        this.chat = chat
    }

    contextBuildCharacterDescription(
        character: any,
    ): string | undefined {
        if (!character.description) return undefined
        return "**Assistant character {{char}}'s description:**\n\n" + character.description + "\n\n"
    }

    contextBuildCharacterPersonality(
        character: any,
    ): string | undefined {
        if (!character.personality) return undefined
        return "**Assistant character {{char}}'s personality:**\n\n" + character.personality + "\n\n"
    }

    contextBuildCharacterScenario(
        character: any,
    ): string | undefined {
        if (!character.scenario) return undefined
        return "**Assistant character {{char}}'s scenario:**\n\n" + character.scenario + "\n\n"
    }

    contextBuildCharacterWiBefore(
    ): string | undefined {
        return undefined // character?.wiBefore ? String(character.wiBefore) : '';
    }

    contextBuildCharacterWiAfter(
    ): string | undefined {
        return undefined // character?.wiAfter ? String(character.wiAfter) : '';
    }

    contextBuildPersonaDescription(
        persona: any,
    ): string | undefined {
        if (!persona.description) return undefined
        return `**User character {{user}}'s description:**\n\n` + persona.description + "\n\n"
    }

    contextBuildSystemPrompt() {
        if (!this.promptConfig.systemPrompt) return undefined
        return `**Instructions:**\n\n${this.promptConfig.systemPrompt}\n\n`
    }

    async testConnection(): Promise<{ ok: boolean; error?: string; models?: any[] }> {
        try {
            const url = this.connection.baseUrl?.endsWith("/")
                ? this.connection.baseUrl
                : this.connection.baseUrl + "/"
            const resp = await fetch(url + "api/tags", { method: "GET" })
            if (!resp.ok) {
                return { ok: false, error: `HTTP ${resp.status}` }
            }
            const data = await resp.json()
            return { ok: true, models: data.models || [] }
        } catch (e: any) {
            return { ok: false, error: e.message || String(e) }
        }
    }

    async refreshModels(): Promise<{ models: any[]; error?: string }> {
        try {
            const url = this.connection.baseUrl?.endsWith("/")
                ? this.connection.baseUrl
                : this.connection.baseUrl + "/"
            const resp = await fetch(url + "api/tags", { method: "GET" })
            if (!resp.ok) {
                return { models: [], error: `HTTP ${resp.status}` }
            }
            const data = await resp.json()
            return { models: data.models || [] }
        } catch (e: any) {
            return { models: [], error: e.message || String(e) }
        }
    }

    buildOllamaMessages(): Array<{ role: string; content: string }> {
        // Convert chatMessages to Ollama's expected format
        return (this.chat.chatMessages || []).map((msg: any) => ({
            role: OllamaAdapter.mapRole(msg.role),
            content: msg.content
        }))
    }

    compilePrompt(): string {
        // Determine character and persona names (use first if multiple)
        const characterName = this.chat.chatCharacters?.[0]?.character?.name || "assistant"
        const persona = this.chat.chatPersonas?.[0]?.persona
        const personaName = persona?.name || "user"
        const character = this.chat.chatCharacters?.[0]?.character

        // Build up contextData with all context fields
        const systemCtxData: Record<string, string | undefined> = {
            char: characterName,
            character: characterName,
            user: personaName,
            persona: this.contextBuildPersonaDescription(persona),
            personaDescription: this.contextBuildPersonaDescription(persona),
            description: this.contextBuildCharacterDescription(character),
            personality: this.contextBuildCharacterPersonality(character),
            scenario: this.contextBuildCharacterScenario(character),
            wiBefore: this.contextBuildCharacterWiBefore(),
            wiAfter: this.contextBuildCharacterWiAfter(),
            system: this.contextBuildSystemPrompt(),
        }

        // console.log("[OllamaAdapter.compilePrompt] Context data:\n", systemCtxData)

        // Render the full context template for the system block
        const systemTemplate = this.contextConfig.template || "{{system}}";
        const renderedSystemBlock = Handlebars.compile(systemTemplate)(systemCtxData);
        const systemBlock = GenerateBlock.makeBlock({ format: this.contextConfig.format || "chatml", role: "system", content: renderedSystemBlock });

        // Build message lines for chat history
        const messageBlock = this.chat.chatMessages.map((msg: SelectChatMessage) => {
            return GenerateBlock.makeBlock({ format: this.contextConfig.format || "chatml", role: msg.role! || "assistant", content: `{{${msg.role === "user" ? "user" : msg.role === "assistant" ? "char" : msg.role === "system" ? "system" : "system"}}}:\n${msg.content}` })
        }).join("")
        
        const promptBlocks = [
            systemBlock, 
            messageBlock, 
        ]

        if (this.contextConfig.alwaysForceName) {
            promptBlocks.push(GenerateBlock.makeBlock({ format: this.contextConfig.format || "chatml", role: "assistant", content: "{{char}}:", includeClose: false }))
        }

        const prompt = Handlebars.compile(promptBlocks.join("\n\n"))(systemCtxData)
        // console.log("[OllamaAdapter.compilePrompt] Compiled prompt:\n\n", prompt, "\n\n")
        return prompt.trim()
    }

    async sendText({
        model,
        options = {}
    }: {
        model?: string
        options?: Record<string, any>
    }): Promise<Response> {
        // Send a completion request to Ollama using a single prompt
        const url = this.connection.baseUrl?.endsWith("/")
            ? this.connection.baseUrl
            : this.connection.baseUrl + "/"
        const weights = this.weights || {}
        const weightsForApi = OllamaWeightsMapper.toOllama(weights)
        const { stream, ...filteredWeights } = weightsForApi
        const { stream: streamOpt, ...filteredOptions } = options
        const prompt = this.compilePrompt()
        const body: Record<string, any> = {
            model: model || this.connection.model,
            prompt,
            stream: stream || false,
            options: {
                ...filteredWeights,
                ...filteredOptions
            }
        }
        console.log("[OllamaAdapter.sendText] Request body:", body)
        // Timeout/abort logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300_000); // 5 minutes
        try {
            const response = await fetch(url + "api/generate", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                signal: controller.signal
            })
            return response;
        } catch (err: any) {
            if (err.name === "AbortError") {
                console.error("OllamaAdapter.sendText: Request timed out");
            } else {
                console.error("OllamaAdapter.sendText: Fetch failed:", err);
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Send a prompt to Ollama and stream the response, with abort support.
     * @param {object} params
     * @param {string} params.prompt
     * @param {string} [params.model]
     * @param {Record<string, any>} [params.options]
     * @param {(data: string) => void} [params.onData] - Called for each streamed chunk
     * @param {AbortSignal} [params.signal] - Optional abort signal
     * @returns {Promise<{ok: boolean, error?: string, completion?: string}>}
     */
    async streamCompletion({
        prompt,
        model,
        options = {},
        onData,
        signal
    }: {
        prompt: string
        model?: string
        options?: Record<string, any>
        onData?: (data: string) => void
        signal?: AbortSignal
    }): Promise<{ ok: boolean; error?: string; completion?: string }> {
        try {
            const url = this.connection.baseUrl?.endsWith("/")
                ? this.connection.baseUrl
                : this.connection.baseUrl + "/"
            const body = {
                model: model || this.connection.model,
                prompt,
                stream: true,
                ...options
            }
            const response = await fetch(url + "api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal
            })
            if (!response.ok) {
                return { ok: false, error: `HTTP ${response.status}` }
            }
            let finalResult = ""
            await this.parseOllamaStream(response, (chunk) => {
                finalResult += chunk
                if (onData) onData(chunk)
            })
            return { ok: true, completion: finalResult }
        } catch (e: any) {
            if (e.name === "AbortError") {
                return { ok: false, error: "aborted" }
            }
            return { ok: false, error: e.message || String(e) }
        }
    }

    /**
     * Utility to map SillyTavern roles to Ollama roles if needed (future-proofing)
     */
    static mapRole(role: string): string {
        // Ollama uses 'user' and 'assistant' (like OpenAI)
        if (role === "system") return "system"
        if (role === "assistant" || role === "bot") return "assistant"
        return "user"
    }

    /**
     * getCompletion: returns a Promise<string> for normal completion,
     * or a handler function for streaming mode (handler(cb) => void).
     * Streaming is determined by this.weights.streaming (if enabled), otherwise false.
     */
    getCompletion(): Promise<string> | ((cb: (chunk: string) => void) => Promise<void>) {
        // Determine streaming from weights
        let stream = false;
        if (this.weights && typeof this.weights.streaming !== "undefined") {
            // Only use streaming if the streamingEnabled flag is not false (or missing)
            if (this.weights.streamingEnabled === false) {
                stream = false;
            } else {
                stream = !!this.weights.streaming;
            }
        }
        if (stream) {
            // Return a handler function that takes a callback
            return async (cb: (chunk: string) => void) => {
                let content = "";
                const result = await this.streamCompletion({
                    prompt: this.compilePrompt(),
                    model: this.connection!.model!,
                    options: {},
                    onData: (chunk) => {
                        content += chunk;
                        cb(chunk);
                    }
                });
                if (result.ok) {
                    const stopStrings = StopStrings.get(this.contextConfig.format || "chatml");
                    const systemCtxData: Record<string, string> = {
                        char: this.chat.chatCharacters?.[0]?.character?.name || "assistant",
                        user: this.chat.chatPersonas?.[0]?.persona?.name || "user"
                    };
                    // Final callback with the full, stop-string-trimmed content
                    cb(applyStopStrings(content, stopStrings, systemCtxData));
                } else {
                    cb("FAILURE: " + (result.error || "Unknown error"));
                }
            }
        } else {
            // Return a Promise<string> as before
            return (async () => {
                const response = await this.sendText({
                    model: this.connection!.model!
                })
                if (response.ok) {
                    const raw = await response.text();
                    try {
                        const data = JSON.parse(raw);
                        return data?.response || ""
                    } catch (err) {
                        let content = "";
                        let lastDone = false;
                        raw.split(/\r?\n/).forEach(line => {
                            if (!line.trim()) return;
                            try {
                                const obj = JSON.parse(line);
                                if (obj.response) content += obj.response;
                                if (obj.done) lastDone = true;
                            } catch (e) {
                                console.error("OllamaAdapter.getCompletion: Failed to parse line as JSON:", line, e);
                            }
                        });
                        const stopStrings = StopStrings.get(this.contextConfig.format || "chatml");
                        const systemCtxData: Record<string, string> = {
                            char: this.chat.chatCharacters?.[0]?.character?.name || "assistant",
                            user: this.chat.chatPersonas?.[0]?.persona?.name || "user"
                        };
                        content = applyStopStrings(content, stopStrings, systemCtxData);
                        if (content && lastDone) return content;
                        console.error("OllamaAdapter.getCompletion: Failed to parse JSON or NDJSON. Raw response:", raw)
                        return "FAILURE: Ollama returned non-JSON/NDJSON response. See server logs."
                    }
                }
                return "FAILURE: " + response.statusText
            })();
        }
    }

    // Parse Ollama's streaming response (SillyTavern-style)
    async parseOllamaStream(response: Response, onData: (data: string) => void): Promise<void> {
        const reader = response.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let done = false
        let buffer = ""
        while (!done) {
            const { value, done: doneReading } = await reader.read()
            done = doneReading
            if (value) {
                buffer += decoder.decode(value, { stream: true })
                let lines = buffer.split("\n")
                buffer = lines.pop() || ""
                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const json = JSON.parse(line)
                        if (json.response) onData(json.response)
                    } catch (e) {
                        // Ignore parse errors for incomplete lines
                    }
                }
            }
        }
        if (buffer) {
            try {
                const json = JSON.parse(buffer)
                if (json.response) onData(json.response)
            } catch {}
        }
    }
}

// Helper: Maps weights config to Ollama API keys, only including enabled weights
export class OllamaWeightsMapper {
    static ollamaKeyMap: Record<string, string> = {
        temperature: "temperature",
        topP: "top_p",
        topK: "top_k",
        repetitionPenalty: "repetition_penalty",
        minP: "min_p",
        tfs: "tfs",
        typicalP: "typical_p",
        mirostat: "mirostat",
        mirostatTau: "mirostat_tau",
        mirostatEta: "mirostat_eta",
        penaltyAlpha: "penalty_alpha",
        frequencyPenalty: "frequency_penalty",
        presencePenalty: "presence_penalty",
        responseTokens: "num_predict",
        contextTokens: "num_ctx",
        noRepeatNgramSize: "no_repeat_ngram_size",
        numBeams: "num_beams",
        lengthPenalty: "length_penalty",
        minLength: "min_length",
        encoderRepetitionPenalty: "encoder_repetition_penalty",
        freqPen: "freq_pen",
        presencePen: "presence_pen",
        skew: "skew",
        doSample: "do_sample",
        earlyStopping: "early_stopping",
        dynatemp: "dynatemp",
        minTemp: "min_temp",
        maxTemp: "max_temp",
        dynatempExponent: "dynatemp_exponent",
        smoothingFactor: "smoothing_factor",
        smoothingCurve: "smoothing_curve",
        dryAllowedLength: "dry_allowed_length",
        dryMultiplier: "dry_multiplier",
        dryBase: "dry_base",
        dryPenaltyLastN: "dry_penalty_last_n",
        maxTokensSecond: "max_tokens_second",
        seed: "seed",
        addBosToken: "add_bos_token",
        banEosToken: "ban_eos_token",
        skipSpecialTokens: "skip_special_tokens",
        includeReasoning: "include_reasoning",
        streaming: "streaming", // Not sent to Ollama, handled separately
        mirostatMode: "mirostat_mode",
        xtcThreshold: "xtc_threshold",
        xtcProbability: "xtc_probability",
        nsigma: "nsigma",
        speculativeNgram: "speculative_ngram",
        guidanceScale: "guidance_scale",
        etaCutoff: "eta_cutoff",
        epsilonCutoff: "epsilon_cutoff",
        repPenRange: "rep_pen_range",
        repPenDecay: "rep_pen_decay",
        repPenSlope: "rep_pen_slope",
        logitBias: "logit_bias",
        bannedTokens: "banned_tokens"
    }

    static toOllama(weights: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {}
        for (const [key, value] of Object.entries(weights)) {
            if (key.endsWith("Enabled")) continue // skip enabled flags
            const enabledKey = key + "Enabled"
            if (weights[enabledKey] === false) continue
            if (this.ollamaKeyMap[key]) {
                // Don't include streaming, handled separately
                if (key === "streaming") continue
                result[this.ollamaKeyMap[key]] = value
            }
        }
        return result
    }
}

export class StopStrings {
    static get(format: typeof FormatNames.OPTION): string[] {
        switch (format) {
            case FormatNames.ChatML:
                // <|im_end|> is the explicit stop string for ChatML, plus block starters and template markers
                return [
                    "<|im_end|>",
                    "<|im_start|>",
                    "user:",
                    "char:",
                    "assistant:",
                    "{{user}}:",
                    "{{char}}:"
                ];
            case FormatNames.Basic:
                // Block starters for Basic, plus template markers
                return [
                    "*** user",
                    "*** char",
                    "*** assistant",
                    "*** system",
                    "{{user}}:",
                    "{{char}}:"
                ];
            case FormatNames.Vicuna:
                // Block starters for Vicuna, plus </s> and template markers
                return [
                    "</s>",
                    "### User:",
                    "### Char:",
                    "### Assistant:",
                    "### System:",
                    "{{user}}:",
                    "{{char}}:"
                ];
            case FormatNames.OpenAI:
                // Block starters for OpenAI, plus template markers
                return [
                    "<|user|>",
                    "<|char|>",
                    "<|assistant|>",
                    "<|system|>",
                    "{{user}}:",
                    "{{char}}:"
                ];
            default:
                return ["<|im_end|>"];
        }
    }
}
