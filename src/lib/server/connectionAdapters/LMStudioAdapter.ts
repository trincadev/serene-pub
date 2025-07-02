import Handlebars from "handlebars"
import _ from "lodash"
import { StopStrings } from "../utils/StopStrings"
import { PromptFormats } from "$lib/shared/constants/PromptFormats"
import { TokenCounterOptions } from "$lib/shared/constants/TokenCounters"
import { TokenCounters } from "../utils/TokenCounterManager"
import {
	BaseConnectionAdapter,
	type AdapterExports
} from "./BaseConnectionAdapter"
import {
	type BaseLoadModelOpts,
	type LLM,
	type LLMLoadModelConfig,
	type LLMPredictionOpts,
	type LLMRespondOpts,
	LMStudioClient,
	type OngoingPrediction
} from "@lmstudio/sdk"

class LMStudioAdapter extends BaseConnectionAdapter {
	private _client?: LMStudioClient
	private _modelClient?: LLM
	private prediction?: OngoingPrediction<unknown>
	private _tokenCounter?: TokenCounters

	constructor({
		connection,
		sampling,
		contextConfig,
		promptConfig,
		chat,
		currentCharacterId
	}: {
		connection: SelectConnection
		sampling: SelectSamplingConfig
		contextConfig: SelectContextConfig
		promptConfig: SelectPromptConfig
		chat: SelectChat & {
			chatCharacters?: (SelectChatCharacter & {
				character: SelectCharacter
			})[]
			chatPersonas?: (SelectChatPersona & { persona: SelectPersona })[]
			chatMessages: SelectChatMessage[]
		}
		currentCharacterId: number
	}) {
		super({
			connection,
			sampling,
			contextConfig,
			promptConfig,
			chat,
			currentCharacterId,
			tokenCounter: new TokenCounters(
				connection.tokenCounter || TokenCounterOptions.ESTIMATE
			),
			tokenLimit:
				typeof sampling.contextTokens === "number"
					? sampling.contextTokens
					: 2048,
			contextThresholdPercent: 0.9
		})
	}

	mapSamplingConfig(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(this.sampling)) {
        if (key.endsWith("Enabled")) continue
        const enabledKey = key + "Enabled"
        if ((this.sampling as any)[enabledKey] === false) continue
        if (
            samplingKeyMap[key]
        ) {
            if (key === "streaming") continue
            // Defensive: skip if value is undefined or not a primitive (unless you expect an object)
            if (value === undefined) continue
            // If you expect only primitives, skip objects:
            if (typeof value === "object" && value !== null) continue
            result[
                samplingKeyMap[
                    key
                ]
            ] = value
        }
    }
    return result
}

	// --- LM Studio client instance ---
	getClient() {
		if (!this._client) {
			const baseUrl = this.connection.baseUrl ?? undefined
			this._client = new LMStudioClient({ baseUrl })
		}
		return this._client
	}

	async getModelClient(modelName?: string): Promise<LLM> {
		if (!this._modelClient) {
			const client = this.getClient()
			const name = modelName || this.connection.model
			if (!name || typeof name !== "string")
				throw new Error("Model name required for getModelClient")
			// TODO, keep alive?
			const opts: BaseLoadModelOpts<LLMLoadModelConfig> = {
				config: {
					contextLength: this.sampling.contextTokensEnabled
						? this.sampling.contextTokens || 2048
						: 2048,
					keepModelInMemory: false // TODO: make configurable?
				},
				ttl: 1 // TODO: TTL is off for now to force reloading models
			}
			console.log("LM Studio getModelClient opts", opts)
			this._modelClient = await client.llm.model(name, opts)
		}
		return this._modelClient
	}

	async generate(): Promise<{
		completionResult:
			| string
			| ((cb: (chunk: string) => void) => Promise<void>)
		compiledPrompt: CompiledPrompt
		isAborted: boolean
	}> {
		if (!this.sampling || typeof this.sampling !== "object") {
			throw new Error(
				"LMStudioAdapter: sampling config is missing or invalid"
			)
		}
		if (
			this.sampling.responseTokensEnabled === undefined ||
			this.sampling.responseTokens === undefined
		) {
			throw new Error(
				"LMStudioAdapter: sampling config missing required properties"
			)
		}

		const modelName = this.connection.model ?? connectionDefaults.baseUrl
		const stream = this.connection!.extraJson?.stream || false
		if (typeof modelName !== "string")
			throw new Error("LMStudioAdapter: model must be a string")

		// Prepare stop strings for LM Studio
		const promptContext = {
			format: this.connection.promptFormat || "chatml",
			characters: this.chat.chatCharacters?.map((c) => c.character) || [],
			personas: this.chat.chatPersonas?.map((p) => p.persona) || []
		}
		const stopStrings = StopStrings.get(promptContext)
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
		const compiledPrompt: CompiledPrompt = await this.compilePrompt({})

		let prompt: string = ""

		prompt = compiledPrompt.prompt!

		let options: LLMPredictionOpts<unknown> = {
			stopStrings: stop,
			maxTokens: this.sampling.responseTokensEnabled
				? this.sampling.responseTokens || 2048
				: 2048,
			...this.mapSamplingConfig()
		}

		console.log("options", options)

		// --- LM Studio SDK integration ---
		const modelClient = await this.getModelClient(modelName)

		if (stream) {
			return {
				completionResult: async (cb: (chunk: string) => void) => {
					let fullContent = ""
					let lastChunk = ""
					let abortedEarly = false
					try {
						this.prediction = modelClient.complete(prompt, options)
						for await (const part of this.prediction) {
							if (part?.content) {
								const newChunk = part.content
								fullContent += newChunk
								lastChunk = newChunk
								cb(newChunk)
							}
						}
						// Only emit final content if it's different from the last streamed piece
						if (
							!fullContent.endsWith(lastChunk) ||
							fullContent !== lastChunk
						) {
							// cb("[[FINAL]]" + fullContent)
							return
						}
					} catch (e: any) {
						if (!abortedEarly)
							cb("FAILURE: " + (e.message || String(e)))
					}
				},
				compiledPrompt,
				isAborted: this.isAborting
			}
		} else {
			const content = await (async () => {
				try {
					this.prediction = modelClient.complete(prompt, {
						...options
					})

					const result = await this.prediction

					if (
						result &&
						typeof result === "object" &&
						"content" in result
					) {
						return result.content || ""
					} else {
						return "FAILURE: Unexpected LM Studio result type"
					}
				} catch (e: any) {
					return "FAILURE: " + (e.message || String(e))
				}
			})()
			return {
				completionResult: content ?? "",
				compiledPrompt,
				isAborted: this.isAborting
			}
		}
	}

	abort() {
		this.isAborting = true
		if (this.prediction) {
			this.prediction.cancel()
		}
	}
}

const connectionDefaults = {
	baseUrl: "ws://localhost:1234",
	promptFormat: PromptFormats.VICUNA,
	tokenCounter: TokenCounterOptions.ESTIMATE,
	extraJson: {
		stream: true,
		// think: false,
		keepAlive: "300ms"
		// raw: true
	}
}

// --- SamplingConfig mapping ---
const samplingKeyMap: Record<string, string> = {
	temperature: "temperature",
	topP: "topPSampling",
	topK: "topKSampling",
	repetitionPenalty: "repeatPenalty",
	minP: "minPSampling",
	xtcProbability: "xtcProbability",
	xtcThreshold: "xtcThreshold",
	responseTokens: "maxTokens",
	stopStrings: "stopStrings"
}

async function testConnection(
	connection: SelectConnection
): Promise<{ ok: boolean; error?: string }> {
	const client = new LMStudioClient({ baseUrl: connection.baseUrl || "" })
	const res = await client.system.getLMStudioVersion()
	if (res && typeof res === "object" && "version" in res) {
		return {
			ok: true
		}
	} else {
		return {
			ok: false
		}
	}
}

async function listModels(
	connection: SelectConnection
): Promise<{ models: any[]; error?: string }> {
	const client = new LMStudioClient({ baseUrl: connection.baseUrl || "" })
	const res = await client.system.listDownloadedModels()
	if (res && Array.isArray(res)) {
		const models = res.map((model) => {
			return {
				model: model.modelKey,
				name: model.displayName
			}
		})
		return {
			models: models,
			error: undefined
		}
	} else {
		console.error(
			"LM Studio listModels error: Unexpected response format",
			res
		)
		return {
			models: [],
			error: "Unexpected response format from LM Studio API"
		}
	}
}

const exports: AdapterExports = {
	Adapter: LMStudioAdapter,
	testConnection,
	listModels,
	connectionDefaults,
	samplingKeyMap
}

export default exports
