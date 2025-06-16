import Handlebars from "handlebars"
import _ from "lodash"
import { StopStrings } from "../utils/StopStrings"
import { Ollama } from "ollama"
import { PromptFormats } from "$lib/shared/constants/PromptFormats"
import { TokenCounterOptions } from "$lib/shared/constants/TokenCounters"
import { TokenCounters } from "../utils/TokenCounterManager"
import { PromptBuilder, getNextCharacterTurn } from '../utils/PromptBuilder';

export class OllamaAdapter {
	connection: SelectConnection
	sampling: SelectSamplingConfig
	contextConfig: SelectContextConfig
	promptConfig: SelectPromptConfig
	chat: SelectChat & {
		chatCharacters: (SelectChatCharacter & {
			character: SelectCharacter
		})[]
		chatPersonas: (SelectChatPersona & { persona: SelectPersona })[]
		chatMessages: SelectChatMessage[]
	}
	currentCharacterId: number
	isAborting = false

	private _client?: Ollama
	private _tokenCounter?: TokenCounters
	promptBuilder: PromptBuilder

	constructor({
		connection,
		sampling,
		contextConfig,
		promptConfig,
		chat,
		currentCharacterId,
	}: {
		connection: SelectConnection
		sampling: SelectSamplingConfig
		contextConfig: SelectContextConfig
		promptConfig: SelectPromptConfig
		chat: SelectChat & {
			chatCharacters?: SelectChatCharacter &
				{ character: SelectCharacter }[]
			chatPersonas?: SelectChatPersona & { persona: SelectPersona }[]
			chatMessages: SelectChatMessage[]
		},
		currentCharacterId: number
	}) {
		this.connection = connection
		this.sampling = sampling
		this.contextConfig = contextConfig
		this.promptConfig = promptConfig
		// Patch: ensure chatCharacters and chatPersonas are always arrays of the correct shape
		this.chat = {
			...chat,
			chatCharacters: (chat.chatCharacters || []).filter((cc: any) => cc && cc.character && cc.chatId !== undefined && cc.characterId !== undefined && cc.position !== undefined && cc.isActive !== undefined),
			chatPersonas: (chat.chatPersonas || []).filter((cp: any) => cp && cp.persona && cp.chatId !== undefined && cp.personaId !== undefined && cp.position !== undefined && typeof cp.chatId === 'number' && typeof cp.personaId === 'number'),
			chatMessages: chat.chatMessages || []
		}
		this.currentCharacterId = currentCharacterId
		this.promptBuilder = new PromptBuilder({
			connection: this.connection,
			sampling: this.sampling,
			contextConfig: this.contextConfig,
			promptConfig: this.promptConfig,
			chat: this.chat,
			currentCharacterId: this.currentCharacterId,
			tokenCounter: this.getTokenCounter(),
			tokenLimit: this.sampling.contextTokens || this.defaultContextLimit,
			contextThresholdPercent: this.contextThresholdPercent,
		})
	}

	// --- Default Ollama connection config ---
	static connectionDefaults = {
		baseUrl: "http://localhost:11434/",
		promptFormat: PromptFormats.VICUNA,
		tokenCounter: TokenCounterOptions.ESTIMATE,
		extraJson: {
			stream: true,
			think: false,
			keepAlive: "300ms",
			raw: true
		}
	}

	defaultContextLimit = 2048
	contextThresholdPercent = 0.9 // we don't want to hit the limit, so we stop at 90% of the context size

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
				result[
					(this.constructor as typeof OllamaAdapter).ollamaKeyMap[key]
				] = value
			}
		}
		return result
	}

	// --- API helpers ---
	static async testConnection(
		connection: SelectConnection
	): Promise<{ ok: boolean; error?: string }> {
		try {
			const ollama = new Ollama({
				// Patch: ensure host is never null
				host: connection.baseUrl ?? undefined
			})
			const res = await ollama.list()
			if (res && Array.isArray(res.models)) {
				return { ok: true }
			} else {
				// console.log("Ollama testConnection response:", res)
				return {
					ok: false,
					error: "Unexpected response format from Ollama API"
				}
			}
		} catch (e: any) {
			console.error("Ollama testConnection error:", e)
			return { ok: false, error: e.message || String(e) }
		}
	}

	static async listModels(
		connection: SelectConnection
	): Promise<{ models: any[]; error?: string }> {
		try {
			const ollama = new Ollama({
				// Patch: ensure host is never null
				host: connection.baseUrl ?? undefined
			})
			const res = await ollama.list()
			if (res && Array.isArray(res.models)) {
				return { models: res.models }
			} else {
				// console.log("Ollama listModels response:", res)
				return {
					models: [],
					error: "Unexpected response format from Ollama API"
				}
			}
		} catch (e: any) {
			console.error("Ollama listModels error:", e)
			return { models: [], error: e.message || String(e) }
		}
	}

	// --- Ollama client instance ---
	getClient() {
		if (!this._client) {
			const host =
				this.connection.baseUrl ?? undefined;
			this._client = new Ollama({ host: host ?? undefined })
		}
		return this._client
	}

	getTokenCounter() {
		if (!this._tokenCounter) {
			this._tokenCounter = new TokenCounters(
				this.connection.tokenCounter || TokenCounterOptions.ESTIMATE
			)
		}
		return this._tokenCounter
	}

	static mapRole(role: string): string {
		if (role === "system") return "system"
		if (role === "assistant" || role === "bot") return "assistant"
		return "user"
	}

	async generate(): Promise<
		[(string | ((cb: (chunk: string) => void) => Promise<void>)), CompiledPrompt]
	> {
		const model =
			this.connection.model ?? OllamaAdapter.connectionDefaults.baseUrl
		const stream = this.connection!.extraJson?.stream || false
		const think = this.connection!.extraJson?.think || false
		const keep_alive = this.connection!.extraJson?.keepAlive || "300ms"
		const raw = this.connection!.extraJson?.raw || false
		if (typeof model !== "string")
			throw new Error("OllamaAdapter: model must be a string")

		// Prepare stop strings for Ollama
		const stopStrings = StopStrings.get(
			this.connection.promptFormat || "chatml"
		)
		const characterName =
			this.chat.chatCharacters?.[0]?.character?.nickname ||
			this.chat.chatCharacters?.[0]?.character?.name ||
			"assistant"
		const personaName = this.chat.chatPersonas?.[0]?.persona?.name || "user"
		const stopContext: Record<string, string> = {
			char: characterName,
			user: personaName
		}
		const stop = stopStrings.map((str) =>
			Handlebars.compile(str)(stopContext)
		)

		// Use PromptBuilder for prompt construction
		
		const compiledPrompt: CompiledPrompt = await this.promptBuilder.compilePrompt()

		const req = {
			model,
			prompt: compiledPrompt.prompt,
			stream,
			think,
			raw,
			keep_alive,
			options: {
				...this.mapSamplingConfig(),
				stop
			}
		}
		if (stream) {
			return [async (cb: (chunk: string) => void) => {
				let content = ""
				let abortedEarly = false;
				try {
					const ollama = this.getClient()
					const result = await ollama.generate({
						...req,
						stream: true
					})
					// If abort was requested before streaming started, abort and return immediately
					if (this.isAborting) {
						ollama.abort();
						return
					}
					for await (const part of result) {
						if (this.isAborting) {
							ollama.abort();
							return
						}
						if (part.response) {
							content += part.response
							cb(part.response)
						}
					}
					// No need to apply stop strings here, Ollama will handle it
				} catch (e: any) {
					if (!abortedEarly) cb("FAILURE: " + (e.message || String(e)))
				}
			}, compiledPrompt]
		} else {
			const content = await (async () => {
				let content = ""
				try {
					const ollama = this.getClient()
					const result = await ollama.generate({
						...req,
						stream: false
					})
					if (this.isAborting) {
						return undefined;
					}
					if (
						result &&
						typeof result === "object" &&
						"response" in result
					) {
						content = result.response || ""
						// No need to apply stop strings here, Ollama will handle it
						return content
					} else {
						return "FAILURE: Unexpected Ollama result type"
					}
				} catch (e: any) {
					return "FAILURE: " + (e.message || String(e))
				}
			})()
			return [content ?? "", compiledPrompt]
		}
	}
	// --- Abort in-flight Ollama request ---
	abort() {
		this.isAborting = true
		const client = this.getClient()
		if (typeof client.abort === "function") {
			client.abort()
		}
	}
}
