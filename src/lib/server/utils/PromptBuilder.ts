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

	// --- Modularized section: scenario interpolation and source ---
	private getScenarioInterpolated(currentCharacter: SelectCharacter, interpolationContext: any): { scenarioInterpolated: string, scenarioSource: null | 'character' | 'chat' } {
		let scenarioInterpolated = ""
		let scenarioSource: null | 'character' | 'chat' = null
		const interpolate = (str: string | undefined) => str ? this.handlebars.compile(str)(interpolationContext) : str
		if (this.chat && (this.chat as any).scenario) {
			scenarioInterpolated = interpolate((this.chat as any).scenario) || ""
			scenarioSource = 'chat'
		} else if (this.chat && (this.chat as any).isGroup) {
			scenarioInterpolated = ""
			scenarioSource = null
		} else {
			const charScenario = this.contextBuildCharacterScenario(currentCharacter) || ""
			scenarioInterpolated = interpolate(charScenario) || ""
			scenarioSource = charScenario ? 'character' : null
		}
		return { scenarioInterpolated, scenarioSource }
	}

	// --- Modularized section: interpolate characters/personas ---
	private getInterpolatedCharacters(interpolationContext: any) {
		const interpolate = (str: string | undefined) => str ? this.handlebars.compile(str)(interpolationContext) : str
		return this.assistantCharacters.map((c: any) => ({
			...c,
			name: interpolate(c.name),
			nickname: interpolate(c.nickname),
			description: interpolate(c.description),
			personality: interpolate(c.personality)
		}))
	}
	private getInterpolatedPersonas(interpolationContext: any) {
		const interpolate = (str: string | undefined) => str ? this.handlebars.compile(str)(interpolationContext) : str
		return this.userCharacters.map((p: any) => ({
			...p,
			name: interpolate(p.name),
			description: interpolate(p.description)
		}))
	}

	// --- Modularized section: build template context ---
	private buildTemplateContext({
		instructions,
		charactersInterpolated,
		personasInterpolated,
		scenarioInterpolated,
		wiBefore,
		wiAfter,
		charName,
		personaName
	}: any) {
		return {
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
	}

	// --- Modularized section: message block construction and token limit logic ---
	private async buildMessageBlocks(templateContext: any, charName: string, personaName: string) {
		let chatMessages = this.chat.chatMessages
			.filter((msg: SelectChatMessage) => !msg.isHidden)
			.map((msg: SelectChatMessage) => ({
				id: msg.id,
				role: msg.role || "assistant",
				name: msg.role === "assistant" ? charName : personaName,
				message: msg.content
			}))
		const minMessages = 3
		let includedMessages = chatMessages.length
		let renderedPrompt = ""
		let totalTokens = 0
		let includedIds: number[] = chatMessages.map(m => m.id)
		let excludedIds: number[] = []
		while (chatMessages.length > minMessages) {
			templateContext.chatMessages = chatMessages
			renderedPrompt = this.handlebars.compile(this.contextConfig.template)(templateContext)
			totalTokens = typeof this.tokenCounter.countTokens === "function"
				? await this.tokenCounter.countTokens(renderedPrompt)
				: 0
			if (totalTokens <= this.tokenLimit) break
			excludedIds.push(chatMessages[0].id)
			chatMessages.shift()
			includedMessages--
		}
		templateContext.chatMessages = chatMessages
		// Final check for minMessages
		renderedPrompt = this.handlebars.compile(this.contextConfig.template)(templateContext)
		totalTokens = typeof this.tokenCounter.countTokens === "function"
			? await this.tokenCounter.countTokens(renderedPrompt)
			: 0
		if (chatMessages.length === minMessages && totalTokens > this.tokenLimit) {
			includedMessages = minMessages
			includedIds = chatMessages.map(m => m.id)
		} else {
			includedMessages = chatMessages.length
			includedIds = chatMessages.map(m => m.id)
		}
		if (chatMessages.length === 0) {
			templateContext.chatMessages = []
			renderedPrompt = this.handlebars.compile(this.contextConfig.template)(templateContext)
			totalTokens = typeof this.tokenCounter.countTokens === "function"
				? await this.tokenCounter.countTokens(renderedPrompt)
				: 0
			includedMessages = 0
			includedIds = []
		}
		return { renderedPrompt, totalTokens, includedMessages, includedIds, excludedIds }
	}

	// --- Modularized section: sources reporting ---
	private buildSources(scenarioSource: null | 'character' | 'chat') {
		const chatCharactersArr = this.chat.chatCharacters || []
		const chatPersonasArr = this.chat.chatPersonas || []
		return {
			characters: chatCharactersArr.map((cc: any) => {
				const c = cc.character
				return {
					id: c.id,
					name: c.name,
					nickname: c.nickname,
					description: Boolean(c.description),
					personality: Boolean(c.personality),
					wiBefore: Boolean(this.contextBuildCharacterWiBefore()),
					wiAfter: Boolean(this.contextBuildCharacterWiAfter()),
					postHistoryInstructions: Boolean(c.postHistoryInstructions)
				}
			}),
			personas: chatPersonasArr.map((cp: any) => {
				const p = cp.persona
				return {
					id: p.id,
					name: p.name,
					description: Boolean(p.description)
				}
			}),
			scenario: scenarioSource
		}
	}

	// --- Modularized section: meta reporting ---
	private buildMeta(excludedIds: number[]) {
		return {
			promptFormat: (this.connection.promptFormat || '').toLowerCase(),
			templateName: this.contextConfig?.name || null,
			timestamp: new Date().toISOString(),
			truncationReason: excludedIds.length ? 'token_limit' : null,
			currentTurnCharacterId: this.currentCharacterId
		}
	}

	// --- Main compilePrompt ---
	async compilePrompt(): Promise<CompiledPrompt> {
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

		this.buildContextData(currentCharacter)

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

		const interpolate = (str: string | undefined) =>
			str ? this.handlebars.compile(str)(interpolationContext) : str

		const instructions = interpolate(this.instructions)
		const wiBefore = interpolate(this.wiBefore)
		const wiAfter = interpolate(this.wiAfter)

		const { scenarioInterpolated, scenarioSource } = this.getScenarioInterpolated(currentCharacter, interpolationContext)
		const assistantCharacters = this.getInterpolatedCharacters(interpolationContext)
		const userCharacters = this.getInterpolatedPersonas(interpolationContext)
		const charactersInterpolated = JSON.stringify(assistantCharacters, null, 2)
		const personasInterpolated = JSON.stringify(userCharacters, null, 2)
		const templateContext = this.buildTemplateContext({
			instructions,
			charactersInterpolated,
			personasInterpolated,
			scenarioInterpolated,
			wiBefore,
			wiAfter,
			charName,
			personaName
		})

		const {
			renderedPrompt,
			totalTokens,
			includedMessages,
			includedIds,
			excludedIds
		} = await this.buildMessageBlocks(templateContext, charName, personaName)

		let finalPrompt = renderedPrompt.trimEnd();
		if ((this.connection.promptFormat || "").toLowerCase() === "chatml") {
			finalPrompt += `\n<|im_start|>assistant\n${charName}: `;
		}

		if (process.env.NODE_ENV === "development") {
			console.log("\n\nPromptBuilder Rendered Prompt:\n", finalPrompt, "\n\n")
		}

		if (!finalPrompt.trim()) {
			console.warn("PromptBuilder: Rendered prompt is empty! Check your template and context.")
			console.warn("Template context:", JSON.stringify(templateContext, null, 2))
			console.warn("Template string:\n", this.contextConfig.template)
		}

		const sources = this.buildSources(scenarioSource)
		const meta = this.buildMeta(excludedIds)

		return {
			prompt: finalPrompt,
			tokenCounts: {
				total: totalTokens as number,
				limit: this.tokenLimit
			},
			messages: {
				included: includedMessages,
				total: this.chat.chatMessages.length,
				includedIds,
				excludedIds
			},
			sources,
			meta
		}
	}
}
