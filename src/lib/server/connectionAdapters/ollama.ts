import Handlebars from "handlebars"
import _ from "lodash"
import { BlockGenerator } from "../utils/BlockGenerator"
import { StopStrings } from "../utils/StopStrings"
import { Ollama } from "ollama"

export class OllamaAdapter {
    connection: SelectConnection
    sampling: SelectSamplingConfig
    contextConfig: SelectContextConfig
    promptConfig: SelectPromptConfig
    chat: SelectChat & {
        chatCharacters?: SelectChatCharacter & { character: SelectCharacter }[]
        chatPersonas?: SelectChatPersona & { persona: SelectPersona }[]
        chatMessages: SelectChatMessage[]
    }

    constructor({
        connection,
        sampling,
        contextConfig,
        promptConfig,
        chat
    }: {
        connection: SelectConnection
        sampling: SelectSamplingConfig
        contextConfig: SelectContextConfig
        promptConfig: SelectPromptConfig
        chat: SelectChat & {
            chatCharacters?: SelectChatCharacter & { character: SelectCharacter }[]
            chatPersonas?: SelectChatPersona & { persona: SelectPersona }[]
            chatMessages: SelectChatMessage[]
        }
    }) {
        this.connection = connection
        this.sampling = sampling
        this.contextConfig = contextConfig
        this.promptConfig = promptConfig
        this.chat = chat
    }

    // --- Default Ollama connection config ---
    static connectionDefaults = {
        baseUrl: "http://localhost:11434/",
        extraJson: {
            stream: true,
            think: false,
            keepAlive: "300ms",
            raw: true
        }
    }

    // --- Context builders ---
    contextBuildCharacterDescription(character: any): string | undefined {
        if (!character?.description) return undefined
        return `**Assistant character {{char}}'s description:**\n\n${character.description}\n\n`
    }
    contextBuildCharacterPersonality(character: any): string | undefined {
        if (!character?.personality) return undefined
        return `**Assistant character {{char}}'s personality:**\n\n${character.personality}\n\n`
    }
    contextBuildCharacterScenario(character: any): string | undefined {
        if (!character?.scenario) return undefined
        return `**Assistant character {{char}}'s scenario:**\n\n${character.scenario}\n\n`
    }
    contextBuildCharacterWiBefore(): string | undefined {
        return undefined
    }
    contextBuildCharacterWiAfter(): string | undefined {
        return undefined
    }
    contextBuildPersonaDescription(persona: any): string | undefined {
        if (!persona?.description) return undefined
        return `**User character {{user}}'s description:**\n\n${persona.description}\n\n`
    }
    contextBuildSystemPrompt(): string | undefined {
        if (!this.promptConfig.systemPrompt) return undefined
        return `**Instructions:**\n\n${this.promptConfig.systemPrompt}\n\n`
    }

    // --- SamplingConfig mapping ---
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

    mapSamplingConfig(): Record<string, any> {
        const result: Record<string, any> = {}
        for (const [key, value] of Object.entries(this.sampling)) {
            if (key.endsWith("Enabled")) continue
            const enabledKey = key + "Enabled"
            if ((this.sampling as any)[enabledKey] === false) continue
            if ((this.constructor as typeof OllamaAdapter).ollamaKeyMap[key]) {
                if (key === "streaming") continue
                result[(this.constructor as typeof OllamaAdapter).ollamaKeyMap[key]] = value
            }
        }
        return result
    }

    // --- Stop string application ---
    applyStopStrings(
        response: string,
        stopStrings: string[],
        context?: Record<string, string>
    ): string {
        let earliestIndex = response.length
        for (const stop of stopStrings) {
            let stopStr = stop
            if (context && stopStr.includes("{{")) {
                stopStr = Handlebars.compile(stopStr)(context)
            }
            const regex = new RegExp(stopStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "m")
            const match = response.match(regex)
            if (match && match.index !== undefined && match.index < earliestIndex) {
                earliestIndex = match.index
            }
        }
        return response.slice(0, earliestIndex)
    }

    // --- API helpers ---
    static async testConnection(connection: SelectConnection): Promise<{ ok: boolean; error?: string }> {
        try {
            const ollama = new Ollama({
                host: connection.baseUrl
            })
            const res = await ollama.list()
            if (res && Array.isArray(res.models)) {
                return { ok: true }
            } else {
                console.log("Ollama testConnection response:", res)
                return { ok: false, error: "Unexpected response format from Ollama API" }
            }
        } catch (e: any) {
            console.error("Ollama testConnection error:", e)
            return { ok: false, error: e.message || String(e) }
        }
    }

    static async listModels(connection: SelectConnection): Promise<{ models: any[]; error?: string }> {
        try {
            const ollama = new Ollama({
                host: connection.baseUrl
            })
            const res = await ollama.list()
            if (res && Array.isArray(res.models)) {
                return { models: res.models }
            } else {
                console.log("Ollama listModels response:", res)
                return { models: [], error: "Unexpected response format from Ollama API" }
            }
        } catch (e: any) {
            console.error("Ollama listModels error:", e)
            return { models: [], error: e.message || String(e) }
        }
    }

    // --- Prompt construction ---
    compilePrompt(): string {
        const characterName = this.chat.chatCharacters?.[0]?.character?.name || "assistant"
        const persona = this.chat.chatPersonas?.[0]?.persona
        const personaName = persona?.name || "user"
        const character = this.chat.chatCharacters?.[0]?.character
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
            system: this.contextBuildSystemPrompt()
        }
        const systemTemplate = this.contextConfig.template || "{{system}}"
        const renderedSystemBlock = Handlebars.compile(systemTemplate)(systemCtxData)
        const systemBlock = BlockGenerator.makeBlock({
            format: this.contextConfig.format || "chatml",
            role: "system",
            content: renderedSystemBlock
        })
        const messageBlock = this.chat.chatMessages
            .map((msg: SelectChatMessage) => {
                return BlockGenerator.makeBlock({
                    format: this.contextConfig.format || "chatml",
                    role: msg.role! || "assistant",
                    content: `{{${msg.role === "user" ? "user" : msg.role === "assistant" ? "char" : msg.role === "system" ? "system" : "system"}}}:\n${msg.content}`
                })
            })
            .join("")
        const promptBlocks = [systemBlock, messageBlock]
        if (this.contextConfig.alwaysForceName) {
            promptBlocks.push(
                BlockGenerator.makeBlock({
                    format: this.contextConfig.format || "chatml",
                    role: "assistant",
                    content: "{{char}}:",
                    includeClose: false
                })
            )
        }
        const prompt = Handlebars.compile(promptBlocks.join("\n\n"))(systemCtxData)
        return prompt.trim()
    }

    // --- Ollama client instance ---
    getClient() {
        const host = this.connection.baseUrl || OllamaAdapter.connectionDefaults.baseUrl
        return new Ollama({ host })
    }

    static mapRole(role: string): string {
        if (role === "system") return "system"
        if (role === "assistant" || role === "bot") return "assistant"
        return "user"
    }

    generate(): Promise<string> | ((cb: (chunk: string) => void) => Promise<void>) {
        const model = this.connection.model ?? OllamaAdapter.connectionDefaults.baseUrl
        const stream = this.connection!.extraJson?.stream || false
        const think = this.connection!.extraJson?.think || false
        const keep_alive = this.connection!.extraJson?.keepAlive || "300ms"
        const raw = this.connection!.extraJson?.raw || false
        if (typeof model !== "string") throw new Error("OllamaAdapter: model must be a string")
        const req = {
            model,
            prompt: this.compilePrompt(),
            stream,
            think,
            raw,
            keep_alive,
            options: {
                ...this.mapSamplingConfig()
            }
        }
        if (stream) {
            return async (cb: (chunk: string) => void) => {
                let content = ""
                try {
                    const ollama = this.getClient()
                    const result = await ollama.generate({ ...req, stream: true })
                    for await (const part of result) {
                        if (part.response) {
                            content += part.response
                            cb(part.response)
                        }
                    }
                    const stopStrings = StopStrings.get(this.contextConfig.format || "chatml")
                    const systemCtxData: Record<string, string> = {
                        char: this.chat.chatCharacters?.[0]?.character?.name || "assistant",
                        user: this.chat.chatPersonas?.[0]?.persona?.name || "user"
                    }
                    const trimmed = this.applyStopStrings(content, stopStrings, systemCtxData)
                    if (trimmed !== content) {
                        cb(trimmed.slice(content.length))
                    }
                } catch (e: any) {
                    cb("FAILURE: " + (e.message || String(e)))
                }
            }
        } else {
            return (async () => {
                let content = ""
                try {
                    const ollama = this.getClient()
                    const result = await ollama.generate({ ...req, stream: false })
                    if (result && typeof result === "object" && "response" in result) {
                        content = result.response || ""
                        const stopStrings = StopStrings.get(this.contextConfig.format || "chatml")
                        const systemCtxData: Record<string, string> = {
                            char: this.chat.chatCharacters?.[0]?.character?.name || "assistant",
                            user: this.chat.chatPersonas?.[0]?.persona?.name || "user"
                        }
                        return this.applyStopStrings(content, stopStrings, systemCtxData)
                    } else {
                        return "FAILURE: Unexpected Ollama result type"
                    }
                } catch (e: any) {
                    return "FAILURE: " + (e.message || String(e))
                }
            })()
        }
    }
}
