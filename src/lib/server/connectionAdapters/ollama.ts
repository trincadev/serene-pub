// Helper: Replace {{var}} with contextData[var] (SillyTavern-style)
function replaceVars(str: string, data: Record<string, string>): string {
    return str.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => data[key] ?? "")
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

    applyNameReplacements(str: string, characterName: string, personaName: string): string {
        return str
            .replace(/{{\s*char\s*}}/g, characterName)
            .replace(/{{\s*user\s*}}/g, personaName)
            .replace(/{{\s*character\s*}}/g, characterName)
            .replace(/{{\s*persona\s*}}/g, personaName)
    }

    contextBuildCharacterDescription(
        character: any,
        characterName: string,
        personaName: string
    ): string {
        const desc = character?.description
            ? `${character.name || ""}'s description: \n ${character.description} \n\n\u200B`
            : ""
        return this.applyNameReplacements(desc, characterName, personaName)
    }

    contextBuildCharacterPersonality(
        character: any,
        characterName: string,
        personaName: string
    ): string {
        const pers = character?.personality
            ? `${character.name || ""}'s personality: \n ${character.personality} \n\n\u200B`
            : ""
        return this.applyNameReplacements(pers, characterName, personaName)
    }

    contextBuildCharacterScenario(
        character: any,
        characterName: string,
        personaName: string
    ): string {
        const scen = "" // character?.scenario ? `Scenario: ${character.scenario}` : '';
        return this.applyNameReplacements(scen, characterName, personaName)
    }

    contextBuildCharacterWiBefore(
        character: any,
        characterName: string,
        personaName: string
    ): string {
        const wi = "" // character?.wiBefore ? String(character.wiBefore) : '';
        return this.applyNameReplacements(wi, characterName, personaName)
    }

    contextBuildCharacterWiAfter(
        character: any,
        characterName: string,
        personaName: string
    ): string {
        const wi = "" // character?.wiAfter ? String(character.wiAfter) : '';
        return this.applyNameReplacements(wi, characterName, personaName)
    }

    contextBuildPersonaDescription(
        persona: any,
        characterName: string,
        personaName: string
    ): string {
        const desc = persona?.description
            ? `${persona.name || ""}'s description: \n ${persona.description} \n\u200B`
            : ""
        return this.applyNameReplacements(desc, characterName, personaName)
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

    compilePrompt(): [string, string] {
        // Determine character and persona names (use first if multiple)
        const characterName = this.chat.chatCharacters?.[0]?.character?.name || "assistant"
        const persona = this.chat.chatPersonas?.[0]?.persona
        const personaName = persona?.name || "user"
        const character = this.chat.chatCharacters?.[0]?.character

        // Parse {{#if ...}} blocks in contextConfig.template, supporting nested/complex keys
        let contextTemplate = this.contextConfig?.template || ""
        // Only use context builders for non-disabled fields
        const contextBuilders: Record<string, (arg: any) => string> = {
            description: (c) =>
                this.contextBuildCharacterDescription(c, characterName, personaName),
            personality: (c) =>
                this.contextBuildCharacterPersonality(c, characterName, personaName),
            // scenario, wiBefore, wiAfter intentionally left as empty string builders
            persona: (p) => this.contextBuildPersonaDescription(p, characterName, personaName)
        }
        // Build up contextData with all context fields (including disabled ones as empty string)
        const personaDesc = contextBuilders.persona(persona)
        const contextData: Record<string, string> = {
            char: characterName,
            character: characterName,
            persona: personaDesc, // persona now resolves to description
            personaDescription: personaDesc, // also for personaDescription
            description: contextBuilders.description(character),
            personality: contextBuilders.personality(character),
            scenario: this.contextBuildCharacterScenario(character, characterName, personaName),
            wiBefore: this.contextBuildCharacterWiBefore(character, characterName, personaName),
            wiAfter: this.contextBuildCharacterWiAfter(character, characterName, personaName)
        }
        // Replace {{#if key}}...{{/if}} blocks
        contextTemplate = contextTemplate.replace(
            /{{#if ([\w.]+)}}([\s\S]*?){{\/if}}/g,
            (match: string, key: string, inner: string) => {
                // Use contextData for all lookups
                const value = contextData[key]
                if (typeof value === "string" && value.trim() !== "") {
                    // Replace variables in the inner block
                    return inner.replace(/{{\s*([\w.]+)\s*}}/g, (_, varKey: string) => {
                        return contextData[varKey] ?? ""
                    })
                }
                return ""
            }
        )

        // Build message lines
        const messageLines = this.chat.chatMessages.map((msg: SelectChatMessage) => {
            let displayName = ""
            if (msg.role === "assistant" || msg.role === "bot") {
                displayName = characterName
            } else if (msg.role === "user") {
                displayName = personaName
            } else {
                displayName = msg.role || "user"
            }
            return `${displayName}: ${msg.content}`
        })

        // Layer together all parts
        const promptLayers = [
            this.promptConfig?.systemPrompt
                ? "**Instructions:** \n " + this.promptConfig?.systemPrompt + " \n --- "
                : "",
            "**Context:** \n " + contextTemplate + " \n --- ",
            "**Message history (from oldest to newest):**",
            messageLines.join(" \n ")
        ]

        // Replace template tags in the final prompt
        let prompt = promptLayers.filter(Boolean).join(" \n ")
        prompt = replaceVars(prompt, contextData).replace(/{{[^}]+}}/g, "") // Remove any other template tags
        return [prompt.trim(), personaName] // Return both prompt and character name
    }

    async sendText({
        prompt,
        model,
        options = {}
    }: {
        prompt: string
        model?: string
        options?: Record<string, any>
    }): Promise<Response> {
        // Send a completion request to Ollama
        const url = this.connection.baseUrl?.endsWith("/")
            ? this.connection.baseUrl
            : this.connection.baseUrl + "/"
        // Use OllamaWeightsMapper to build weightsForApi
        const weights = this.weights || {}
        const weightsForApi = OllamaWeightsMapper.toOllama(weights)
        const body = {
            model: model || this.connection.model,
            prompt,
            stream: weights.streamingEnabled ? weights.streaming : false,
            ...weightsForApi,
            ...options
        }
        console.log("[OllamaAdapter.sendText] Request body:", body)
        return fetch(url + "api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
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
     * Send a prompt to Ollama, get the response, and remove the character name prefix if present.
     * This replaces the old getCompletion signature.
     */
    async getCompletion(): Promise<string> {
        let [prompt, charName] = this.compilePrompt()
        console.log("OllamaAdapter getCompletion prompt:", prompt)

        const response = await this.sendText({
            prompt,
            model: this.connection!.model!
        });
        if (response.ok) {

            // Send a completion request to Ollama
            const url = this.connection.baseUrl?.endsWith("/")
                ? this.connection.baseUrl
                : this.connection.baseUrl + "/"
            const weights = this.weights || {}
            const weightsForApi: Record<string, any> = {}
            for (const [key, value] of Object.entries(weights)) {
                if (key.endsWith("Enabled") && value === true) {
                    const baseKey = key.replace(/Enabled$/, "")
                    const weightsAny = weights as Record<string, any>
                    if (
                        baseKey in weightsAny &&
                        weightsAny[baseKey] !== undefined &&
                        weightsAny[baseKey] !== null
                    ) {
                        weightsForApi[baseKey] = weightsAny[baseKey]
                    }
                }
            }
            const body = {
                model: this.connection.model,
                prompt,
                stream: weights.streamingEnabled ? weights.streaming : false,
                ...weightsForApi
                // ...options
            }
            const response = await fetch(url + "api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })
            let result = ""
            if (!response.body) return result
            const reader = response.body.getReader()
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
                            if (json.response) result += json.response
                        } catch (e) {
                            // Ignore parse errors for incomplete lines
                        }
                    }
                }
            }
            if (buffer) {
                try {
                    const json = JSON.parse(buffer)
                    if (json.response) result += json.response
                } catch {}
            }
            // Try to extract character name from the prompt if not provided
            if (!charName) {
                // Heuristic: look for '**Context:**' or similar, then find the first 'X:' in the message history
                const match = prompt.match(/\n([A-Za-z0-9_\- ]+): /)
                if (match) charName = match[1]
            }
            if (charName) {
                // Remove all leading lines that start with the character name and a colon (case-insensitive, multiline)
                const regex = new RegExp(
                    `^${charName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*`,
                    "i"
                )
                // Remove prefix at the start of the result, and also after any newlines (for multi-line responses)
                result = result.replace(new RegExp(`(^|\n)${charName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*`, "gi"), "$1")
            }
            return result
        }
        return "FAILURE: " + response.statusText
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
