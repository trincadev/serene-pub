import { PromptBuilder } from "../utils/PromptBuilder"
import type { TokenCounters } from "../utils/TokenCounterManager"

export abstract class BaseConnectionAdapter {
	static connectionDefaults: Record<string, any>
	static samplingKeyMap: Record<string, string>

	connection: SelectConnection
	sampling: SelectSamplingConfig
	contextConfig: SelectContextConfig
	promptConfig: SelectPromptConfig
	chat: SelectChat & {
		chatCharacters: (SelectChatCharacter & { character: SelectCharacter })[]
		chatPersonas: (SelectChatPersona & { persona: SelectPersona })[]
		chatMessages: SelectChatMessage[]
	}
	currentCharacterId: number
	isAborting = false
	promptBuilder: PromptBuilder

	constructor({
		connection,
		sampling,
		contextConfig,
		promptConfig,
		chat,
		currentCharacterId,
		tokenCounter,
		tokenLimit,
		contextThresholdPercent
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
		tokenCounter: TokenCounters
		tokenLimit: number
		contextThresholdPercent: number
	}) {
		this.connection = connection
		this.sampling = sampling
		this.contextConfig = contextConfig
		this.promptConfig = promptConfig
		this.chat = {
			...chat,
			chatCharacters: (chat.chatCharacters || []).filter(
				(cc: any) => cc && cc.character
			),
			chatPersonas: (chat.chatPersonas || []).filter(
				(cp: any) => cp && cp.persona
			),
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
			tokenCounter,
			tokenLimit,
			contextThresholdPercent
		})
	}

	abstract generate(): Promise<
		[
			string | ((cb: (chunk: string) => void) => Promise<void>),
			CompiledPrompt
		]
	>

	abort() {
		this.isAborting = true
	}
}
