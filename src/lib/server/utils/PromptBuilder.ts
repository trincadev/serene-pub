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
		chat: SelectChat & {
			chatCharacters?: (SelectChatCharacter & {
				character: SelectCharacter & {
					lorebook?: SelectLorebook & {
						worldLoreEntries: SelectWorldLoreEntry[]
						characterLoreEntries: SelectCharacterLoreEntry[]
						historyEntries: SelectHistoryEntry[]
						lorebookBindings: SelectLorebookBinding[]
					}
				}
			})[]
			chatPersonas?: (SelectChatPersona & {
				persona: SelectPersona & {
					lorebook?: SelectLorebook & {
						worldLoreEntries: SelectWorldLoreEntry[]
						characterLoreEntries: SelectCharacterLoreEntry[]
						historyEntries: SelectHistoryEntry[]
						lorebookBindings: SelectLorebookBinding[]
					}
				}
			})[]
			chatMessages: SelectChatMessage[]
			lorebook?: SelectLorebook & {
				worldLoreEntries: SelectWorldLoreEntry[]
				characterLoreEntries: SelectCharacterLoreEntry[]
				historyEntries: SelectHistoryEntry[]
				lorebookBindings: SelectLorebookBinding[]
			}
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
					// If available, check for id property in the context
					// Handlebars context for each message should have id
					const messageId =
						this.id !== undefined
							? this.id
							: options.data && options.data.id
					return PromptBlockFormatter.makeBlock({
						format: promptFormat,
						role: "assistant",
						content: options.fn(this),
						includeClose: messageId !== -2
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
	private getScenarioInterpolated(
		currentCharacter: SelectCharacter,
		interpolationContext: any
	): {
		scenarioInterpolated: string
		scenarioSource: null | "character" | "chat"
	} {
		let scenarioInterpolated = ""
		let scenarioSource: null | "character" | "chat" = null
		const interpolate = (str: string | undefined) =>
			str ? this.handlebars.compile(str)(interpolationContext) : str
		if (this.chat && (this.chat as any).scenario) {
			scenarioInterpolated =
				interpolate((this.chat as any).scenario) || ""
			scenarioSource = "chat"
		} else if (this.chat && (this.chat as any).isGroup) {
			scenarioInterpolated = ""
			scenarioSource = null
		} else {
			const charScenario =
				this.contextBuildCharacterScenario(currentCharacter) || ""
			scenarioInterpolated = interpolate(charScenario) || ""
			scenarioSource = charScenario ? "character" : null
		}
		return { scenarioInterpolated, scenarioSource }
	}

	// --- Modularized section: interpolate characters/personas ---
	private getInterpolatedCharacters(interpolationContext: any) {
		const interpolate = (str: string | undefined) =>
			str ? this.handlebars.compile(str)(interpolationContext) : str
		return this.assistantCharacters.map((c: any) => ({
			...c,
			name: interpolate(c.name),
			nickname: interpolate(c.nickname),
			description: interpolate(c.description),
			personality: interpolate(c.personality)
		}))
	}
	private getInterpolatedPersonas(interpolationContext: any) {
		const interpolate = (str: string | undefined) =>
			str ? this.handlebars.compile(str)(interpolationContext) : str
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
	private async buildMessageBlocks(
		templateContext: any,
		_charName: string,
		_personaName: string
	) {
		const chatCharacters = this.chat.chatCharacters as
			| (SelectChatCharacter & { character: SelectCharacter })[]
			| undefined
		const chatPersonas = this.chat.chatPersonas as
			| (SelectChatPersona & { persona: SelectPersona })[]
			| undefined
		let chatMessages = this.chat.chatMessages
			.filter((msg: SelectChatMessage) => !msg.isHidden)
			.map((msg: SelectChatMessage) => {
				let charName = _charName
				let personaName = _personaName
				let interpolationContext = {
					char: charName,
					character: charName,
					user: personaName,
					persona: personaName
				}
				if (msg.characterId && chatCharacters) {
					const foundChar = chatCharacters.find(
						(cc) => cc.character.id === msg.characterId
					)?.character
					if (foundChar) {
						charName = foundChar.nickname || foundChar.name
						interpolationContext = {
							...interpolationContext,
							char: charName,
							character: charName
						}
					}
				}
				if (msg.personaId && chatPersonas) {
					const foundPersona = chatPersonas.find(
						(cp) => cp.persona.id === msg.personaId
					)?.persona
					if (foundPersona) {
						personaName = foundPersona.name
						interpolationContext = {
							...interpolationContext,
							user: personaName,
							persona: personaName
						}
					}
				}
				const interpolate = (str: string | undefined) =>
					str
						? this.handlebars.compile(str)(interpolationContext)
						: str
				return {
					id: msg.id,
					role: msg.role || "assistant",
					name: msg.role === "assistant" ? charName : personaName,
					message: interpolate(msg.content)
				}
			})
		// Always append an empty message for the current character
		// if (this.contextConfig?.alwaysForceName) {
		chatMessages.push({
			id: -2, // Use -2 to indicate this is a generated/empty message
			role: "assistant",
			name: _charName,
			message: ""
		})
		// }

		// const minMessages = 3
		let includedMessages = chatMessages.length // Exclude the last empty message
		let renderedPrompt = ""
		let totalTokens = 0
		let includedIds: number[] = chatMessages.map((m) => m.id)
		let excludedIds: number[] = []
		// while (chatMessages.length > minMessages) {
		// 	templateContext.chatMessages = chatMessages
		// 	renderedPrompt = this.handlebars.compile(
		// 		this.contextConfig.template
		// 	)(templateContext)
		// 	totalTokens =
		// 		typeof this.tokenCounter.countTokens === "function"
		// 			? await this.tokenCounter.countTokens(renderedPrompt)
		// 			: 0
		// 	if (totalTokens <= this.tokenLimit) break
		// 	excludedIds.push(chatMessages[0].id)
		// 	chatMessages.shift()
		// 	includedMessages--
		// }

		let completed = false
		let priority = 4
		let messagesIterator:
			| IterableIterator<SelectChatMessage>
			| undefined
			| null
		let worldLoreEntryIterator:
			| IterableIterator<SelectWorldLoreEntry>
			| undefined
			| null
		let characterLoreEntryIterator:
			| IterableIterator<SelectCharacterLoreEntry>
			| undefined
			| null
		let historyEntryIterator:
			| IterableIterator<SelectHistoryEntry>
			| undefined
			| null
		let consideredWorldLoreEntries: SelectWorldLoreEntry[] = []
		let consideredCharacterLoreEntries: SelectCharacterLoreEntry[] = []
		let consideredHistoryEntries: SelectHistoryEntry[] = []
		const includedWorldLoreEntries: SelectWorldLoreEntry[] = []
		const includedCharacterLoreEntries: SelectCharacterLoreEntry[] = []
		const includedHistoryEntries: SelectHistoryEntry[] = []
		const messageFailedWorldLoreMatches: Record<number, number[]> = {} // {messageId: [entryId1, entryId2, ...]}
		const messageFailedCharacterLoreMatches: Record<number, number[]> = {} // {messageId: [entryId1, entryId2, ...]}
		const messageFailedHistoryMatches: Record<number, number[]> = {} // {messageId: [entryId1, entryId2, ...]}

		while (!completed && totalTokens <= this.tokenLimit) {
			switch (priority) {
				case 4:
					if (messagesIterator === undefined) {
						messagesIterator = this.chatMessageIterator({
							priority
						})
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreEntryIterator =
							this.characterLoreEntryIterator({ priority })
						historyEntryIterator = this.historyEntryIterator({
							priority
						})
					} else if (
						messagesIterator === null &&
						worldLoreEntryIterator === null &&
						characterLoreEntryIterator === null &&
						historyEntryIterator === null
					) {
						// If all iterators are exhausted, move to next priority
						priority = 3
						continue
					}
					break
				case 3:
					if (
						messagesIterator === null &&
						characterLoreEntryIterator === null &&
						worldLoreEntryIterator === null
					) {
						messagesIterator = this.chatMessageIterator({
							priority
						})
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreEntryIterator =
							this.characterLoreEntryIterator({ priority })
						priority = 2 // Move to next priority after initialization
					}
					break
				case 2:
					if (
						historyEntryIterator === null &&
						characterLoreEntryIterator === null &&
						worldLoreEntryIterator === null
					) {
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreEntryIterator =
							this.characterLoreEntryIterator({ priority })
						historyEntryIterator = this.historyEntryIterator({
							priority
						})
						priority = 1 // Move to next priority after initialization
					}
					break
				case 1:
					if (
						characterLoreEntryIterator === null &&
						worldLoreEntryIterator === null
					) {
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreEntryIterator =
							this.characterLoreEntryIterator({ priority })
						priority = 0 // Move to next priority after initialization
					}
					break
				case 0:
					if (
						historyEntryIterator === null &&
						characterLoreEntryIterator === null &&
						worldLoreEntryIterator === null &&
						messagesIterator === null
					) {
						completed = true // All iterators are exhausted, exit loop
					}
					break
				default:
					throw new Error(`Unknown priority: ${priority}`)
			}

			const nextMessageVal = messagesIterator?.next()
			const nextWorldLoreEntryVal = worldLoreEntryIterator?.next()
			const nextCharacterLoreEntryVal = characterLoreEntryIterator?.next()
			const nextHistoryEntryVal = historyEntryIterator?.next()

			// MESSAGES
			if (!nextMessageVal || nextMessageVal.done) {
				messagesIterator = null
			} else if (nextMessageVal.value) {
				chatMessages.push(nextMessageVal.value)
			}

			// WORLD LORE ENTRIES
			if (!nextWorldLoreEntryVal || nextWorldLoreEntryVal.done) {
				worldLoreEntryIterator = null
			} else if (nextWorldLoreEntryVal.value && priority === 4) {
				// Always include priority 4 entries
				includedWorldLoreEntries.push(nextWorldLoreEntryVal.value)
			} else if (nextWorldLoreEntryVal.value) {
				consideredWorldLoreEntries.push(nextWorldLoreEntryVal.value)
			}

			// CHARACTER LORE ENTRIES
			if (!nextCharacterLoreEntryVal || nextCharacterLoreEntryVal.done) {
				characterLoreEntryIterator = null
			} else if (nextCharacterLoreEntryVal.value && priority === 4) {
				// Always include priority 4 entries
				includedCharacterLoreEntries.push(
					nextCharacterLoreEntryVal.value
				)
			} else if (nextCharacterLoreEntryVal.value) {
				consideredCharacterLoreEntries.push(
					nextCharacterLoreEntryVal.value
				)
			}

			// HISTORY ENTRIES
			if (!nextHistoryEntryVal || nextHistoryEntryVal.done) {
				historyEntryIterator = null
			} else if (nextHistoryEntryVal.value && priority === 4) {
				// Always include priority 4 entries
				includedHistoryEntries.push(nextHistoryEntryVal.value)
			} else if (nextHistoryEntryVal.value) {
				consideredHistoryEntries.push(nextHistoryEntryVal.value)
			}

			chatMessages.forEach((msg) => {
				// 1. Process World Lore Matches
				// Loop over consideredWorldLoreEntries
				consideredWorldLoreEntries.forEach((entry) => {
					// Skip if entry is in failed matches for this message
					if (
						messageFailedWorldLoreMatches[msg.id] &&
						messageFailedWorldLoreMatches[msg.id].includes(entry.id)
					) {
						return
					}
					let msgContent = entry.caseSensitive
						? msg.message || ""
						: msg.message?.toLowerCase() || ""
					let matchFound = entry.keys.some((key) => {
						const keyToCheck = entry.caseSensitive
							? key
							: key.toLowerCase()

						if (entry.useRegex) {
							const regex = new RegExp(keyToCheck, "g")
							return regex.test(msgContent)
						} else {
							return msgContent.includes(keyToCheck)
						}
					})
					if (matchFound) {
						// Add to included, remove from considered
						includedWorldLoreEntries.push(entry)
						consideredHistoryEntries =
							consideredHistoryEntries.filter(
								(e) => e.id !== entry.id
							)
					} else {
						// Add to failed matches for this message
						if (!messageFailedWorldLoreMatches[msg.id]) {
							messageFailedWorldLoreMatches[msg.id] = []
						}
						messageFailedWorldLoreMatches[msg.id].push(entry.id)
					}
				})
				// 2. Process Character Lore Matches
				// Loop over consideredCharacterLoreEntries
				consideredCharacterLoreEntries.forEach((entry) => {
					// Skip if entry is in failed matches for this message
					if (
						messageFailedCharacterLoreMatches[msg.id] &&
						messageFailedCharacterLoreMatches[msg.id].includes(
							entry.id
						)
					) {
						return
					}
					let msgContent = entry.caseSensitive
						? msg.message || ""
						: msg.message?.toLowerCase() || ""
					let matchFound = entry.keys.some((key) => {
						const keyToCheck = entry.caseSensitive
							? key
							: key.toLowerCase()

						if (entry.useRegex) {
							const regex = new RegExp(keyToCheck, "g")
							return regex.test(msgContent)
						} else {
							return msgContent.includes(keyToCheck)
						}
					})
					if (matchFound) {
						// Add to included, remove from considered
						includedCharacterLoreEntries.push(entry)
						consideredCharacterLoreEntries =
							consideredCharacterLoreEntries.filter(
								(e) => e.id !== entry.id
							)
					} else {
						// Add to failed matches for this message
						if (!messageFailedCharacterLoreMatches[msg.id]) {
							messageFailedCharacterLoreMatches[msg.id] = []
						}
						messageFailedCharacterLoreMatches[msg.id].push(entry.id)
					}
				})

				// 3. Process History Matches
				// Loop over consideredHistoryEntries
				consideredHistoryEntries.forEach((entry) => {
					// Skip if entry is in failed matches for this message
					if (
						messageFailedHistoryMatches[msg.id] &&
						messageFailedHistoryMatches[msg.id].includes(entry.id)
					) {
						return
					}
					let msgContent = entry.caseSensitive
						? msg.message || ""
						: msg.message?.toLowerCase() || ""
					let matchFound = entry.keys.some((key) => {
						const keyToCheck = entry.caseSensitive
							? key
							: key.toLowerCase()

						if (entry.useRegex) {
							const regex = new RegExp(keyToCheck, "g")
							return regex.test(msgContent)
						} else {
							return msgContent.includes(keyToCheck)
						}
					})
					if (matchFound) {
						// Add to included, remove from considered
						includedHistoryEntries.push(entry)
						consideredHistoryEntries =
							consideredHistoryEntries.filter(
								(e) => e.id !== entry.id
							)
					} else {
						// Add to failed matches for this message
						if (!messageFailedHistoryMatches[msg.id]) {
							messageFailedHistoryMatches[msg.id] = []
						}
						messageFailedHistoryMatches[msg.id].push(entry.id)
					}
				})
			})

			templateContext.chatMessages = chatMessages
			// Final check for minMessages
			renderedPrompt = this.handlebars.compile(
				this.contextConfig.template
			)(templateContext)
			totalTokens =
			typeof this.tokenCounter.countTokens === "function"
				? await this.tokenCounter.countTokens(renderedPrompt)
				: 0
		}

		// templateContext.chatMessages = chatMessages
		// // Final check for minMessages
		// renderedPrompt = this.handlebars.compile(this.contextConfig.template)(
		// 	templateContext
		// )
		// totalTokens =
		// 	typeof this.tokenCounter.countTokens === "function"
		// 		? await this.tokenCounter.countTokens(renderedPrompt)
		// 		: 0
		if (
			chatMessages.length === minMessages &&
			totalTokens > this.tokenLimit
		) {
			includedMessages = minMessages
			includedIds = chatMessages.map((m) => m.id)
		} else {
			includedMessages = chatMessages.length - 1 // Exclude the last empty message
			includedIds = chatMessages.map((m) => m.id)
		}
		if (chatMessages.length === 0) {
			templateContext.chatMessages = []
			renderedPrompt = this.handlebars.compile(
				this.contextConfig.template
			)(templateContext)
			totalTokens =
				typeof this.tokenCounter.countTokens === "function"
					? await this.tokenCounter.countTokens(renderedPrompt)
					: 0
			includedMessages = 0
			includedIds = []
		}
		return {
			renderedPrompt,
			totalTokens,
			includedMessages,
			includedIds,
			excludedIds
		}
	}

	// --- Modularized section: sources reporting ---
	private buildSources(scenarioSource: null | "character" | "chat") {
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
			promptFormat: (this.connection.promptFormat || "").toLowerCase(),
			templateName: this.contextConfig?.name || null,
			timestamp: new Date().toISOString(),
			truncationReason: excludedIds.length ? "token_limit" : null,
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

		const { scenarioInterpolated, scenarioSource } =
			this.getScenarioInterpolated(currentCharacter, interpolationContext)
		const assistantCharacters =
			this.getInterpolatedCharacters(interpolationContext)
		const userCharacters =
			this.getInterpolatedPersonas(interpolationContext)
		const charactersInterpolated = JSON.stringify(
			assistantCharacters,
			null,
			2
		)
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
		} = await this.buildMessageBlocks(
			templateContext,
			charName,
			personaName
		)

		let finalPrompt = renderedPrompt.trimEnd()

		const sources = this.buildSources(scenarioSource)
		const meta = this.buildMeta(excludedIds)

		// --- NEW: Return OpenAI-style message list if requested ---
		if (
			this.connection.type === "openai" &&
			!this.connection.extraJson?.prerenderPrompt
		) {
			// Split prompt into blocks by '### ' (keep delimiter)
			const blocks = finalPrompt
				.split(/(?=^### )/m)
				.map((b: string) => b.trim())
				.filter(Boolean)
			const messages: Array<{ role: string; content: string }> = []
			for (const block of blocks) {
				const match = block.match(/^### (\w+):?/)
				let role = "user"
				if (match) {
					const header = match[1].toLowerCase()
					if (header === "assistant") role = "assistant"
					else if (header === "system") role = "system"
					else if (header === "user") role = "user"
					else role = "user"
				}
				const content = block.replace(/^### \w+:?\s*/, "").trim()
				messages.push({ role, content })
			}
			return {
				messages,
				meta: {
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
					sources
				}
			}
		}

		// Default: return as before
		return {
			prompt: finalPrompt,
			meta: {
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
				sources
			}
		}
	}

	/**
	 * Abstract: Iterate over items of a given type and priority from the class instance.
	 * Each subclass should implement its own logic.
	 */
	*chatMessageIterator({
		priority
	}: {
		priority: number
	}): IterableIterator<SelectChatMessage> {
		const messages = this.chat.chatMessages || []
		// Always include the last 3 messages as priority 2 (highest for chat)
		if (priority === 2) {
			for (const msg of messages.slice(-3)) {
				yield msg
			}
		} else if (priority === 1) {
			// All other messages except the last 3
			for (const msg of messages.slice(0, -3)) {
				yield msg
			}
		}
	}

	*worldLoreEntryIterator({
		priority
	}: {
		priority: number
	}): IterableIterator<SelectWorldLoreEntry> {
		const chatWithLorebook = this.chat as typeof this.chat & {
			lorebook?: { worldLoreEntries: SelectWorldLoreEntry[] }
		}
		const entries: SelectWorldLoreEntry[] =
			chatWithLorebook.lorebook?.worldLoreEntries || []
		let filtered: SelectWorldLoreEntry[] = []
		if (priority === 4) {
			filtered = entries.filter(
				(e: SelectWorldLoreEntry) => e.constant === true
			)
		} else if ([3, 2, 1].includes(priority)) {
			filtered = entries.filter(
				(e: SelectWorldLoreEntry) => e.priority === priority
			)
		}
		filtered.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		for (const entry of filtered) {
			// TODO: populate lorebook bindings
			yield entry
		}
	}

	*characterLoreEntryIterator({
		priority
	}: {
		priority: number
	}): IterableIterator<SelectCharacterLoreEntry> {
		const chatWithLorebook = this.chat as typeof this.chat & {
			lorebook?: { characterLoreEntries: SelectCharacterLoreEntry[] }
		}
		const entries: SelectCharacterLoreEntry[] =
			chatWithLorebook.lorebook?.characterLoreEntries || []
		let filtered: SelectCharacterLoreEntry[] = []
		if (priority === 4) {
			filtered = entries.filter(
				(e: SelectCharacterLoreEntry) => e.constant === true
			)
		} else if ([3, 2, 1].includes(priority)) {
			filtered = entries.filter(
				(e: SelectCharacterLoreEntry) => e.priority === priority
			)
		}
		filtered.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		for (const entry of filtered) {
			// TODO: Filter out entries bound to invalid lorebook bindings
			// TODO: populate lorebook bindings
			yield entry
		}
	}

	*historyEntryIterator({
		priority
	}: {
		priority: number
	}): IterableIterator<SelectHistoryEntry> {
		const chatWithLorebook = this.chat as typeof this.chat & {
			lorebook?: { historyEntries: SelectHistoryEntry[] }
		}
		const entries: SelectHistoryEntry[] =
			chatWithLorebook.lorebook?.historyEntries || []
		// Sort by date: year, month, day (descending)
		const sorted = entries.slice().sort((a, b) => {
			const aVal =
				(a.date?.year ?? 0) * 10000 +
				(a.date?.month ?? 0) * 100 +
				(a.date?.day ?? 0)
			const bVal =
				(b.date?.year ?? 0) * 10000 +
				(b.date?.month ?? 0) * 100 +
				(b.date?.day ?? 0)
			return bVal - aVal
		})
		if (priority === 4) {
			// Last 2 most recent entries
			const mostRecent = sorted.slice(0, 2)
			for (const entry of mostRecent) {
				yield entry
			}
			// All pinned (constant === true), skip if already yielded
			for (const entry of sorted) {
				if (entry.constant === true && !mostRecent.includes(entry)) {
					// TODO: populate lorebook bindings
					yield entry
				}
			}
		} else if (priority === 2) {
			// All others, excluding those already yielded
			const yielded = new Set<any>(sorted.slice(0, 2))
			for (const entry of sorted) {
				if (entry.constant === true) yielded.add(entry)
			}
			for (const entry of sorted) {
				if (!yielded.has(entry)) {
					// TODO: populate lorebook bindings
					yield entry
				}
			}
		}
	}
}
