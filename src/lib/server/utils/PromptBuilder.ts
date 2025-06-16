import { PromptBlockFormatter } from "./PromptBlockFormatter"
import Handlebars from "handlebars"
import type { TokenCounters } from "./TokenCounterManager"

export class PromptBuilder {
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
	assistantCharacters: any[] = []
	userCharacters: any[] = []
	systemCtxData: Record<string, any> = {}
	instructions?: string
	wiBefore?: string
	wiAfter?: string

	handlebars: typeof Handlebars

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
		chat: SelectChat &
			SelectChat & {
				chatCharacters?: (SelectChatCharacter & {
					character: SelectCharacter
				})[]
				chatPersonas?: (SelectChatPersona & {
					persona: SelectPersona
				})[]
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
		this.chat = chat
		this.currentCharacterId = currentCharacterId
		this.handlebars = Handlebars.create()
		this.registerHandlebarsHelpers()
		this.tokenCounter = tokenCounter
		this.tokenLimit = tokenLimit
		this.contextThresholdPercent = contextThresholdPercent
	}

	private registerHandlebarsHelpers() {
		const handlebars = this.handlebars
		// Common helpers
		if (!handlebars.helpers.eq) {
			handlebars.registerHelper("eq", (a, b) => a === b)
		}
		if (!handlebars.helpers.ne) {
			handlebars.registerHelper("ne", (a, b) => a !== b)
		}
		if (!handlebars.helpers.and) {
			handlebars.registerHelper("and", (a, b) => a && b)
		}
		if (!handlebars.helpers.or) {
			handlebars.registerHelper("or", (a, b) => a || b)
		}

		// Helper to always get the root promptBuilder instance
		const getPromptBuilder = (ctx: any, options: any) =>
			options?.data?.root?.__promptBuilderInstance ||
			ctx.__promptBuilderInstance
		const getPromptFormat = (ctx: any, options: any) =>
			getPromptBuilder(ctx, options)?.connection?.promptFormat || "chatml"

		if (!handlebars.helpers.systemBlock) {
			handlebars.registerHelper(
				"systemBlock",
				function (this: any, options: any) {
					const promptFormat = getPromptFormat(this, options)
					return PromptBlockFormatter.makeBlock({
						format: promptFormat,
						role: "system",
						content: options.fn(this)
					})
				}
			)
		}
		if (!handlebars.helpers.assistantBlock) {
			handlebars.registerHelper(
				"assistantBlock",
				function (this: any, options: any) {
					const promptFormat = getPromptFormat(this, options)
					return PromptBlockFormatter.makeBlock({
						format: promptFormat,
						role: "assistant",
						content: options.fn(this)
					})
				}
			)
		}
		if (!handlebars.helpers.userBlock) {
			handlebars.registerHelper(
				"userBlock",
				function (this: any, options: any) {
					const promptFormat = getPromptFormat(this, options)
					return PromptBlockFormatter.makeBlock({
						format: promptFormat,
						role: "user",
						content: options.fn(this)
					})
				}
			)
		}
	}

	// --- Context builders ---
	contextBuildCharacterDescription(character: SelectCharacter): string {
		return character.description
	}
	contextBuildCharacterPersonality(
		character: SelectCharacter
	): string | undefined {
		if (!character?.personality) return undefined
		return character.personality
	}
	contextBuildCharacterScenario(
		character: SelectCharacter
	): string | undefined {
		if (!character?.scenario) return undefined
		return character.scenario
	}
	contextBuildCharacterWiBefore(): string | undefined {
		return undefined
	}
	contextBuildCharacterWiAfter(): string | undefined {
		return undefined
	}
	contextBuildPersonaDescription(persona: any): string {
		return persona.description
	}
	contextBuildSystemPrompt(): string {
		return this.promptConfig.systemPrompt
	}
	contextBuildCharacterExampleDialogues(
		character: SelectCharacter
	): string | undefined {
		if (!character?.exampleDialogues) return undefined
		return character.exampleDialogues
	}
	contextBuildPostHistoryInstructions(
		character: SelectCharacter
	): string | undefined {
		if (!character?.postHistoryInstructions) return undefined
		return character.postHistoryInstructions
	}
	contextBuildCharacterName(character: SelectCharacter): string {
		return character.name
	}
	contextBuildCharacterNickname(
		character: SelectCharacter
	): string | undefined {
		return character.nickname || undefined
	}
	contextBuildPersonaName(persona: SelectPersona): string {
		return persona.name
	}

	compileCharacterData(character: SelectCharacter): {
		name: string
		nickname?: string
		description: string
		personality?: string
	} {
		const char = {
			name: this.contextBuildCharacterName(character),
			nickname: this.contextBuildCharacterNickname(character),
			description: this.contextBuildCharacterDescription(character),
			personality: this.contextBuildCharacterPersonality(character)
		}

		// delete any undefined/null properties
		Object.keys(char).forEach((key) => {
			if (
				char[key as keyof typeof char] === undefined ||
				char[key as keyof typeof char] === null
			) {
				delete char[key as keyof typeof char]
			}
		})

		return char
	}

	compilePersonaData(persona: SelectPersona): {
		name: string
		description: string
	} {
		const personaData = {
			name: this.contextBuildPersonaName(persona),
			description: this.contextBuildPersonaDescription(persona)
		}
		// delete any undefined/null properties
		Object.keys(personaData).forEach((key) => {
			if (
				personaData[key as keyof typeof personaData] === undefined ||
				personaData[key as keyof typeof personaData] === null
			) {
				delete personaData[key as keyof typeof personaData]
			}
		})
		return personaData
	}

	async compileHandlebarsData(character: SelectCharacter): Promise<{
		assistant: string
		char: string
		character: string
		persona: string
		user: string
	}> {
		const name = character.nickname || character.name || "assistant"
		return {
			assistant: name,
			char: name,
			character: name,
			persona: "user",
			user: "user"
		}
	}

	buildContextData(currentCharacter: SelectCharacter) {
		const chatCharacters = this.chat.chatCharacters as
			| (SelectChatCharacter & { character: SelectCharacter })[]
			| undefined
		this.assistantCharacters = (chatCharacters || []).map((cc) =>
			this.compileCharacterData(cc.character)
		)
		this.userCharacters = (this.chat.chatPersonas || []).map((cp) =>
			this.compilePersonaData(cp.persona)
		)
		this.instructions = this.contextBuildSystemPrompt()
		this.wiBefore = this.contextBuildCharacterWiBefore()
		this.wiAfter = this.contextBuildCharacterWiAfter()
		this.systemCtxData = {
			assistant_characters: JSON.stringify(this.assistantCharacters),
			user_characters: JSON.stringify(this.userCharacters)
		}
	}

	// --- Prompt construction ---
	async compilePrompt(): Promise<[string, number, number, number, number]> {
		const chatCharacters = this.chat.chatCharacters as
			| (SelectChatCharacter & { character: SelectCharacter })[]
			| undefined
		const currentCharacter = chatCharacters?.find(
			(cc) => cc.character.id === this.currentCharacterId
		)?.character
		if (!currentCharacter) {
			throw new Error(
				`compilePrompt: No character found with ID ${this.currentCharacterId}`
			)
		}

		// Build and assign context data as class properties
		this.buildContextData(currentCharacter)

		// Prepare a Handlebars context for interpolation
		const charName = currentCharacter.nickname || currentCharacter.name
		const personaName =
			(this.chat.chatPersonas &&
				this.chat.chatPersonas[0]?.persona?.name) ||
			"user"
		const interpolationContext = {
			char: charName,
			character: charName,
			user: personaName,
			persona: personaName
		}

		// Interpolate all dynamic fields using Handlebars
		const interpolate = (str: string | undefined) =>
			str ? this.handlebars.compile(str)(interpolationContext) : str

		const instructions = interpolate(this.instructions)
		const scenarioInterpolated = interpolate(
			this.contextBuildCharacterScenario(currentCharacter) || ""
		)
		const wiBefore = interpolate(this.wiBefore)
		const wiAfter = interpolate(this.wiAfter)

		// Interpolate assistant/user characters and personas descriptions
		const assistantCharacters = this.assistantCharacters.map((c: any) => ({
			...c,
			name: interpolate(c.name),
			nickname: interpolate(c.nickname),
			description: interpolate(c.description),
			personality: interpolate(c.personality)
		}))
		const userCharacters = this.userCharacters.map((p: any) => ({
			...p,
			name: interpolate(p.name),
			description: interpolate(p.description)
		}))

		const charactersInterpolated = JSON.stringify(
			assistantCharacters,
			null,
			2
		)
		const personasInterpolated = JSON.stringify(userCharacters, null, 2)

		const templateContext: Record<string, any> = {
			instructions,
			characters: charactersInterpolated,
			personas: personasInterpolated,
			scenario: scenarioInterpolated,
			wiBefore,
			wiAfter,
			chatMessages: [],
			char: charName,
			character: charName,
			user: personaName,
			persona: personaName,
			__promptBuilderInstance: this
		}

		// --- Message block construction and token limit logic ---
		// Build prompt blocks (system, scenario, etc.)
		const promptBlocks: string[] = []
		if (instructions) promptBlocks.push(instructions)
		if (wiBefore) promptBlocks.push(wiBefore)
		if (scenarioInterpolated) promptBlocks.push(scenarioInterpolated)
		// Optionally add example dialogue block (not shown here, but can be added)
		let exampleDialogueBlockIndex = -1
		let thresholdReached = false
		const alwaysInclude = 0 // You can adjust this if you want to always include N most recent messages

		// Build chatMessages for templateContext (all messages, most recent last)
		let chatMessages = this.chat.chatMessages
			.filter((msg: SelectChatMessage) => !msg.isHidden)
			.map((msg: SelectChatMessage) => ({
				role: msg.role || "assistant",
				name: msg.role === "assistant" ? charName : personaName,
				message: msg.content
			}))

		// Always include the 3 most recent messages (last 2 full replies + empty response)
		const minMessages = 3
		let includedMessages = chatMessages.length
		let renderedPrompt = ""
		let totalTokens = 0
		while (chatMessages.length > minMessages) {
			templateContext.chatMessages = chatMessages
			renderedPrompt = this.handlebars.compile(this.contextConfig.template)(templateContext)
			totalTokens = typeof this.tokenCounter.countTokens === "function"
				? await this.tokenCounter.countTokens(renderedPrompt)
				: 0
			if (totalTokens <= this.tokenLimit) break
			// Remove oldest message, but never remove the last minMessages
			chatMessages.shift()
			includedMessages--
		}
		// After loop, check if even the minMessages fit
		templateContext.chatMessages = chatMessages
		renderedPrompt = this.handlebars.compile(this.contextConfig.template)(templateContext)
		totalTokens = typeof this.tokenCounter.countTokens === "function"
			? await this.tokenCounter.countTokens(renderedPrompt)
			: 0
		if (chatMessages.length === minMessages && totalTokens > this.tokenLimit) {
			// If even the 3 most recent don't fit, forcibly include them and return
			includedMessages = minMessages
		} else {
			includedMessages = chatMessages.length
		}

		// If no messages fit, set to empty array
		if (chatMessages.length === 0) {
			templateContext.chatMessages = []
			renderedPrompt = this.handlebars.compile(this.contextConfig.template)(templateContext)
			totalTokens = typeof this.tokenCounter.countTokens === "function"
				? await this.tokenCounter.countTokens(renderedPrompt)
				: 0
			includedMessages = 0
		}

		// If chatml, append opening assistant block and {{char}}: at the end (no closing tag)
		if ((this.connection.promptFormat || "").toLowerCase() === "chatml") {
			renderedPrompt =
				renderedPrompt.trimEnd() +
				`\n<|im_start|>assistant\n${charName}: `
		}

		if (process.env.NODE_ENV === "development") {
			console.log(
				"\n\nPromptBuilder Rendered Prompt:\n",
				renderedPrompt,
				"\n\n"
			)
		}

		if (!renderedPrompt.trim()) {
			console.warn(
				"PromptBuilder: Rendered prompt is empty! Check your template and context."
			)
			console.warn(
				"Template context:",
				JSON.stringify(templateContext, null, 2)
			)
			console.warn("Template string:\n", this.contextConfig.template)
		}

		return [
			renderedPrompt.trimEnd(),
			totalTokens as number,
			this.tokenLimit,
			includedMessages,
			this.chat.chatMessages.length
		]
	}
}
