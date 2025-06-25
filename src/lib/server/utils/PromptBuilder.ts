import { PromptBlockFormatter } from "./PromptBlockFormatter"
import Handlebars from "handlebars"
import type { TokenCounters } from "./TokenCounterManager"
import type { BasePromptChat } from "../connectionAdapters/BaseConnectionAdapter"

export class PromptBuilder {
	connection: SelectConnection
	sampling: SelectSamplingConfig
	contextConfig: SelectContextConfig
	promptConfig: SelectPromptConfig
	chat: BasePromptChat
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
	includedWorldLoreEntries: SelectWorldLoreEntry[] = []
	includedCharacterLoreEntries: SelectCharacterLoreEntry[] = []
	includedHistoryEntries: SelectHistoryEntry[] = []

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
		chat: BasePromptChat
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

	getCharacterDisplayName(character: SelectCharacter): string {
		return character.nickname || character.name || "assistant"
	}

	async compileHandlebarsData(character: SelectCharacter): Promise<{
		assistant: string
		char: string
		character: string
		persona: string
		user: string
	}> {
		const name = this.getCharacterDisplayName(character)
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
	}: any): TemplateContext {
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
		templateContext: TemplateContext,
		_charName: string,
		_personaName: string
	) {
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
		const messageFailedWorldLoreMatches: Record<number, number[]> = {}
		const messageFailedCharacterLoreMatches: Record<number, number[]> = {}
		const messageFailedHistoryMatches: Record<number, number[]> = {}

		// --- NEW: Efficient context assembly and token counting ---
		let chatMessages: {
			id: number
			role: "assistant" | "user"
			name: string
			message: string | undefined
		}[] = [
			{
				id: -2, // Placeholder for the current character's empty message
				role: "assistant",
				name: _charName,
				message: ""
			}
		]
		let includedMessages = 0
		let includedIds: number[] = []
		let excludedIds: number[] = []
		let renderedPrompt = ""
		let totalTokens = 0

		// Ensure interpolationContext is available
		const interpolationContext = {
			char: _charName,
			character: _charName,
			user: _personaName,
			persona: _personaName
		}

		// --- Track included entries for worldLore/history objects ---
		// Accept both entry and binding types for lore arrays
		let includedWorldLoreEntries: any[] = []
		let includedCharacterLoreEntries: any[] = []
		let includedHistoryEntries: SelectHistoryEntry[] = []
		let isBelowThreshold = true
		let isAboveThreshold = false
		let isOverLimit = false

		// --- DEBUG: Start timing ---
		const debugTimings: any[] = []
		const overallStart = Date.now()

		let iterationCount = 0
		while (!completed) {
			iterationCount++
			const iterStart = Date.now()
			// 1. Advance iterators and update pools
			switch (priority) {
				case 4:
					if (messagesIterator === undefined) {
						// console.log("Initializing iterators for priority 4")
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
						// console.log("Switching to priority 3")
						messagesIterator = this.chatMessageIterator({
							priority
						})
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreEntryIterator =
							this.characterLoreEntryIterator({ priority })
						priority = 2
					}
					break
				case 2:
					if (
						historyEntryIterator === null &&
						characterLoreEntryIterator === null &&
						worldLoreEntryIterator === null &&
						messagesIterator === null
					) {
						// console.log("Switching to priority 2")
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreEntryIterator =
							this.characterLoreEntryIterator({ priority })
						historyEntryIterator = this.historyEntryIterator({
							priority
						})
						messagesIterator = this.chatMessageIterator({
							priority
						})
						priority = 1
					}
					break
				case 1:
					if (
						characterLoreEntryIterator === null &&
						worldLoreEntryIterator === null
					) {
						// console.log("Switching to priority 1")
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreEntryIterator =
							this.characterLoreEntryIterator({ priority })
						priority = 0
					}
					break
				case 0:
					if (
						historyEntryIterator === null &&
						characterLoreEntryIterator === null &&
						worldLoreEntryIterator === null &&
						messagesIterator === null
					) {
						// console.log("Completed all priorities")
						completed = true
						continue
					}
					break
				default:
					throw new Error(`Unknown priority: ${priority}`)
			}

			let nextMessageVal
			let nextWorldLoreEntryVal
			let nextCharacterLoreEntryVal
			let nextHistoryEntryVal
			if (!isOverLimit) {
				nextMessageVal = messagesIterator?.next()

				if (isBelowThreshold) {
					// console.log("worldLoreEntryIterator", worldLoreEntryIterator)
					nextWorldLoreEntryVal = worldLoreEntryIterator?.next()
					nextCharacterLoreEntryVal =
						characterLoreEntryIterator?.next()
					nextHistoryEntryVal = historyEntryIterator?.next()
				}

				// console.log("nextWorldLoreEntryVal:", nextWorldLoreEntryVal)

				// MESSAGES
				if (!nextMessageVal || nextMessageVal.done) {
					messagesIterator = null
				} else if (nextMessageVal.value && !isOverLimit) {
					// Normalize message structure
					const msg = nextMessageVal.value
					let charName = _charName
					let personaName = _personaName
					let msgInterpolationContext = { ...interpolationContext }
					if (msg.characterId && this.chat.chatCharacters) {
						const foundChar = this.chat.chatCharacters.find(
							(cc) => cc.character.id === msg.characterId
						)?.character
						if (foundChar) {
							charName = foundChar.nickname || foundChar.name
							msgInterpolationContext = {
								...msgInterpolationContext,
								char: charName,
								character: charName
							}
						}
					}
					if (msg.personaId && this.chat.chatPersonas) {
						const foundPersona = this.chat.chatPersonas.find(
							(cp) => cp.persona.id === msg.personaId
						)?.persona
						if (foundPersona) {
							personaName = foundPersona.name
							msgInterpolationContext = {
								...msgInterpolationContext,
								user: personaName,
								persona: personaName
							}
						}
					}
					const interpolate = (str: string | undefined) =>
						str
							? this.handlebars.compile(str)(
									msgInterpolationContext
								)
							: str
					chatMessages.push({
						id: msg.id,
						role: msg.role || "assistant",
						name: msg.role === "assistant" ? charName : personaName,
						message: interpolate(msg.content)
					})
				}

				if (isBelowThreshold) {
					// WORLD LORE ENTRIES
					if (!nextWorldLoreEntryVal || nextWorldLoreEntryVal.done) {
						worldLoreEntryIterator = null
					} else if (nextWorldLoreEntryVal.value && priority === 4) {
						includedWorldLoreEntries.push(
							nextWorldLoreEntryVal.value
						)
					} else if (nextWorldLoreEntryVal.value) {
						consideredWorldLoreEntries.push(
							nextWorldLoreEntryVal.value
						)
					}

					// CHARACTER LORE ENTRIES
					if (
						!nextCharacterLoreEntryVal ||
						nextCharacterLoreEntryVal.done
					) {
						characterLoreEntryIterator = null
					} else if (
						nextCharacterLoreEntryVal.value &&
						priority === 4
					) {
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
						includedHistoryEntries.push(nextHistoryEntryVal.value)
					} else if (nextHistoryEntryVal.value) {
						consideredHistoryEntries.push(nextHistoryEntryVal.value)
					}

					// --- Lore/History matching ---
					chatMessages.forEach((msg) => {
						// 1. Process World Lore Matches
						consideredWorldLoreEntries.forEach((entry) => {
							if (
								messageFailedWorldLoreMatches[msg.id] &&
								messageFailedWorldLoreMatches[msg.id].includes(
									entry.id
								)
							) {
								return
							}
							let msgContent = entry.caseSensitive
								? msg.message || ""
								: msg.message?.toLowerCase() || ""
							let matchFound = entry.keys.split(",").some((key) => {
								const keyToCheck = entry.caseSensitive
									? key.trim()
									: key.toLowerCase().trim()
								if (entry.useRegex) {
									const regex = new RegExp(keyToCheck, "g")
									return regex.test(msgContent)
								} else {
									return msgContent.includes(keyToCheck)
								}
							})
							if (matchFound) {
								includedWorldLoreEntries.push(
									this.populateLorebookEntryBindings(entry)
								)
								consideredWorldLoreEntries =
									consideredWorldLoreEntries.filter(
										(e) => e.id !== entry.id
									)
							} else {
								if (!messageFailedWorldLoreMatches[msg.id])
									messageFailedWorldLoreMatches[msg.id] = []
								messageFailedWorldLoreMatches[msg.id].push(
									entry.id
								)
							}
						})
						// 2. Process Character Lore Matches
						consideredCharacterLoreEntries.forEach((entry) => {
							if (
								messageFailedCharacterLoreMatches[msg.id] &&
								messageFailedCharacterLoreMatches[
									msg.id
								].includes(entry.id)
							) {
								return
							}
							let msgContent = entry.caseSensitive
								? msg.message || ""
								: msg.message?.toLowerCase() || ""
							let matchFound = entry.keys.split(",").some((key) => {
								const keyToCheck = entry.caseSensitive
									? key.trim()
									: key.toLowerCase().trim()
								if (entry.useRegex) {
									const regex = new RegExp(keyToCheck, "g")
									return regex.test(msgContent)
								} else {
									return msgContent.includes(keyToCheck)
								}
							})
							if (matchFound) {
								includedCharacterLoreEntries.push(
									this.populateLorebookEntryBindings(entry)
								)
								consideredCharacterLoreEntries =
									consideredCharacterLoreEntries.filter(
										(e) => e.id !== entry.id
									)
							} else {
								if (!messageFailedCharacterLoreMatches[msg.id])
									messageFailedCharacterLoreMatches[msg.id] =
										[]
								messageFailedCharacterLoreMatches[msg.id].push(
									entry.id
								)
							}
						})
						// 3. Process History Matches (do not call populateLorebookEntryBindings)
						consideredHistoryEntries.forEach((entry) => {
							if (
								messageFailedHistoryMatches[msg.id] &&
								messageFailedHistoryMatches[msg.id].includes(
									entry.id
								)
							) {
								return
							}
							let msgContent = entry.caseSensitive
								? msg.message || ""
								: msg.message?.toLowerCase() || ""
							let matchFound = entry.keys.split(",").some((key) => {
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
								includedHistoryEntries.push(entry)
								consideredHistoryEntries =
									consideredHistoryEntries.filter(
										(e) => e.id !== entry.id
									)
							} else {
								if (!messageFailedHistoryMatches[msg.id])
									messageFailedHistoryMatches[msg.id] = []
								messageFailedHistoryMatches[msg.id].push(
									entry.id
								)
							}
						})
					})
				}
			}

			// --- Rebuild the entire template context for this iteration ---
			const assistantCharacters =
				this.getInterpolatedCharacters(interpolationContext)
			const assistantCharactersWithLore =
				this.attachCharacterLoreToCharacters(
					assistantCharacters,
					includedCharacterLoreEntries,
					this.chat
				)
			const charactersInterpolated = JSON.stringify(
				assistantCharactersWithLore,
				null,
				2
			)
			const userCharactersWithLore = this.attachCharacterLoreToPersonas(
				this.getInterpolatedPersonas(interpolationContext),
				includedCharacterLoreEntries,
				this.chat
			)
			const personasInterpolated = JSON.stringify(
				userCharactersWithLore,
				null,
				2
			)

			templateContext.characters = charactersInterpolated
			templateContext.personas = personasInterpolated
			templateContext.chatMessages = chatMessages
			templateContext.characterLore = includedCharacterLoreEntries

			const worldLoreObj: Record<string, string> = {}
			for (const entry of includedWorldLoreEntries) {
				if (entry && entry.name && entry.content) {
					worldLoreObj[entry.name] = entry.content
				}
			}
			templateContext.worldLore = Object.keys(worldLoreObj).length
				? JSON.stringify(worldLoreObj, null, 2)
				: undefined

			const historyObj: Record<string, string> = {}
			includedHistoryEntries.forEach((entry) => {
				if (entry.content.trim()) {
					// Only populate bindings if the entry has the required lorebook fields
					let populatedEntry = entry
					if ((entry as any).name && (entry as any).keys) {
						const lorePopulated = this.populateLorebookEntryBindings(entry as any)
						// Only update content if the function returns a content property
						if (lorePopulated && typeof lorePopulated.content === "string") {
							populatedEntry = { ...entry, content: lorePopulated.content }
						}
					}
					// Format date as LLM-friendly string: year:YYYY,month:M,day:D (omit month/day if undefined)
					let dateKey = `year:${populatedEntry.date.year}`
					if (populatedEntry.date.month !== undefined && populatedEntry.date.month !== null) dateKey += `,month:${populatedEntry.date.month}`
					if (populatedEntry.date.day !== undefined && populatedEntry.date.day !== null) dateKey += `,day:${populatedEntry.date.day}`
					historyObj[dateKey] = populatedEntry.content
				}
			})
			let mostRecentDate: {
				year: number
				month: number | undefined
				day: number | undefined
			} | null = null
			if (includedHistoryEntries.length) {
				mostRecentDate = {
					year: includedHistoryEntries[0].date.year,
					month: !!includedHistoryEntries[0].date.month
						? includedHistoryEntries[0].date.month
						: undefined,
					day: !!includedHistoryEntries[0].date.day
						? includedHistoryEntries[0].date.day
						: undefined
				}
			}
			// Format currentDate as LLM-friendly string: year:YYYY,month:M,day:D (omit month/day if undefined)
			if (mostRecentDate) {
				let dateKey = `year:${mostRecentDate.year}`
				if (mostRecentDate.month !== undefined && mostRecentDate.month !== null) dateKey += `,month:${mostRecentDate.month}`
				if (mostRecentDate.day !== undefined && mostRecentDate.day !== null) dateKey += `,day:${mostRecentDate.day}`
				templateContext.currentDate = dateKey
			} else {
				templateContext.currentDate = undefined
			}
			templateContext.history = Object.keys(historyObj).length
				? JSON.stringify(historyObj)
				: undefined

			// // Always ensure exactly one empty message for the current character, and it is last
			// let emptyMsgIdx = chatMessages.findIndex((m) => m.id === -2)
			// if (emptyMsgIdx === -1) {
			// 	// chatMessages.push({
			// 	// 	id: -2,
			// 	// 	role: "assistant",
			// 	// 	name: _charName,
			// 	// 	message: ""
			// 	// })
			// } else {
			// 	// Remove any duplicate empty messages
			// 	for (let i = chatMessages.length - 1; i >= 0; i--) {
			// 		if (chatMessages[i].id === -2 && i !== emptyMsgIdx) {
			// 			chatMessages.splice(i, 1)
			// 		}
			// 	}
			// 	// Move the empty message to the end if not already
			// 	if (emptyMsgIdx !== chatMessages.length - 1) {
			// 		const [emptyMsg] = chatMessages.splice(emptyMsgIdx, 1)
			// 		chatMessages.push(emptyMsg)
			// 	}
			// }

			// --- Over-limit logic: remove last non-placeholder message and re-count tokens ---
			if (isOverLimit) {
				// console.log("[PromptBuilder] Over token limit, removing last non-placeholder message")
				if (chatMessages.length > 3) {
					const popped = chatMessages.pop()
				} else {
					completed = true
				}
			}

			const iterationRate = isBelowThreshold
				? 10
				: isAboveThreshold
					? 2
					: isOverLimit
						? 1
						: 1
			if ((priority !== 4 && iterationCount % iterationRate === 0) || isOverLimit) {
				includedMessages = chatMessages.length - 1 // Exclude the last empty message
				includedIds = chatMessages
					.filter((m) => m.id !== -2)
					.map((m) => m.id)

				// --- Render and count tokens ---
				renderedPrompt = this.handlebars.compile(
					this.contextConfig.template
				)({
					...templateContext,
					chatMessages: [...chatMessages].reverse()
				})
				totalTokens =
					typeof this.tokenCounter.countTokens === "function"
						? await this.tokenCounter.countTokens(renderedPrompt)
						: 0

				isBelowThreshold = isBelowThreshold
					? totalTokens <
						this.tokenLimit * this.contextThresholdPercent
					: isBelowThreshold
				isAboveThreshold = !isAboveThreshold
					? totalTokens >=
						this.tokenLimit * this.contextThresholdPercent
					: isAboveThreshold
				isOverLimit = !isOverLimit
					? totalTokens > this.tokenLimit
					: isOverLimit
				const iterEnd = Date.now()
				debugTimings.push({
					priority,
					chatMessagesCount: chatMessages.length,
					totalTokens,
					iterationMs: iterEnd - iterStart
				})
			}

			// console.log("totalTokens:", totalTokens)
			if (isOverLimit && totalTokens <= this.tokenLimit) {
				// console.log("completing")
				completed = true
			}
		}
		// console.log("Total iterations:", iterationCount)
		const overallEnd = Date.now()
		// console.log("[PromptBuilder] buildMessageBlocks timings:", debugTimings)
		// console.log(
		// 	`[PromptBuilder] buildMessageBlocks total time: ${overallEnd - overallStart}ms, iterations: ${debugTimings.length}`
		// )

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
		const assistantCharactersWithLore =
			this.attachCharacterLoreToCharacters(
				assistantCharacters,
				this.includedCharacterLoreEntries,
				this.chat
			)
		const charactersInterpolated = JSON.stringify(
			assistantCharactersWithLore,
			null,
			2
		)
		const userCharactersWithLore = this.attachCharacterLoreToPersonas(
			this.getInterpolatedPersonas(interpolationContext),
			this.includedCharacterLoreEntries,
			this.chat
		)
		const personasInterpolated = JSON.stringify(
			userCharactersWithLore,
			null,
			2
		)
		const templateContext: TemplateContext = this.buildTemplateContext({
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
				const content = block.replaceAll(/^### \w+:?\s*/, "").trim()
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
		// // console.log(`chatMessageIterator called with priority ${priority}, total messages: ${messages.length}`)
		// Always include the last 3 messages as priority 4 (highest for chat)
		if (priority === 4) {
			for (const msg of messages.slice(-3).reverse()) {
				yield msg
			}
		} else if (priority === 2) {
			// All other messages except the last 3
			for (const msg of messages.slice(0, -3).reverse()) {
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
		// console.log("pre-filtered world lore entries:", entries)
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
		// Remove entries for characters not in the chat
		filtered = filtered.filter((e: SelectCharacterLoreEntry) => {
			if (!e.lorebookBindingId) {
				return false
			}
			const lorebook =
				this.chat.lorebookId === e.lorebookId
					? this.chat.lorebook
					: undefined
			if (!lorebook) {
				return false
			} // Todo: search other lorebooks?
			const binding = lorebook.lorebookBindings.find(
				(b: SelectLorebookBinding) => b.id === e.lorebookBindingId
			)
			if (!binding) {
				return false
			}
			if (binding.characterId) {
				return this.chat.chatCharacters?.some(
					(cc) => cc.character.id === binding.characterId
				)
			} else if (binding.personaId) {
				return this.chat.chatPersonas?.some(
					(cp) => cp.persona.id === binding.personaId
				)
			}
			return false
		})
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

	populateLorebookEntryBindings(
		entry: SelectWorldLoreEntry | SelectCharacterLoreEntry
	): SelectWorldLoreEntry | SelectCharacterLoreEntry {
		// TODO properly choose the correct lorebook
		const lorebook:
			| (SelectLorebook & {
					lorebookBindings: (SelectLorebookBinding & {
						character?: SelectCharacter
						persona?: SelectPersona
					})[]
			  })
			| undefined =
			this.chat.lorebook && this.chat.lorebook.id === entry.lorebookId
				? this.chat.lorebook
				: undefined
		if (!lorebook) return entry

		lorebook.lorebookBindings.forEach((binding) => {
			if (binding.character) {
				const name =
					binding.character.nickname || binding.character.name
				entry.content = entry.content.replaceAll(binding.binding, name)
			} else if (binding.persona) {
				const name = binding.persona.name
				entry.content = entry.content.replaceAll(binding.binding, name)
			} else {
				return
			}
		})
		return entry
	}

	private attachCharacterLoreToCharacters(
		characters: TemplateContextCharacter[],
		includedCharacterLoreEntries: SelectCharacterLoreEntry[],
		chat: BasePromptChat
	): TemplateContextCharacter[] {
		// Build a map of characterId to lore entries
		const loreMap: Record<number, Record<string, string>> = {}
		includedCharacterLoreEntries.forEach((entry) => {
			// Find the binding for this entry
			const lorebook =
				chat.lorebook && chat.lorebook.id === entry.lorebookId
					? chat.lorebook
					: undefined
			if (!lorebook) return
			const binding = lorebook.lorebookBindings.find(
				(b: SelectLorebookBinding) => b.id === entry.lorebookBindingId
			)
			if (binding && binding.characterId) {
				if (!loreMap[binding.characterId])
					loreMap[binding.characterId] = {}
				loreMap[binding.characterId][entry.name!] = entry.content
			}
		})
		// Attach loreEntries to each character
		return characters.map((char) => {
			// Try to find the characterId (by name match or id if available)
			const chatChar = (chat.chatCharacters || []).find(
				(cc) =>
					cc.character.nickname === char.nickname ||
					cc.character.name === char.name
			)
			const charId = chatChar?.character?.id
			return {
				...char,
				"extra lore": charId && loreMap[charId] ? loreMap[charId] : {}
			}
		})
	}

	private attachCharacterLoreToPersonas(
		personas: TemplateContextPersona[],
		includedCharacterLoreEntries: SelectCharacterLoreEntry[],
		chat: BasePromptChat
	): TemplateContextPersona[] {
		// Build a map of personaId to lore entries
		const loreMap: Record<number, Record<string, string>> = {}
		includedCharacterLoreEntries.forEach((entry) => {
			// Find the binding for this entry
			const lorebook =
				chat.lorebook && chat.lorebook.id === entry.lorebookId
					? chat.lorebook
					: undefined
			if (!lorebook) return
			const binding = lorebook.lorebookBindings.find(
				(b: SelectLorebookBinding) => b.id === entry.lorebookBindingId
			)
			if (binding && binding.personaId) {
				if (!loreMap[binding.personaId])
					loreMap[binding.personaId] = {}
				loreMap[binding.personaId][entry.name!] = entry.content
			}
		})
		// Attach loreEntries to each persona
		return personas.map((persona) => {
			// Try to find the personaId (by name match or id if available)
			const chatPersona = (chat.chatPersonas || []).find(
				(cp) => cp.persona.name === persona.name
			)
			const personaId = chatPersona?.persona?.id
			return {
				...persona,
				"extra lore":
					personaId && loreMap[personaId] ? loreMap[personaId] : []
			}
		})
	}
}

// --- Types for template context ---
export type TemplateContextCharacter = {
	name: string
	nickname?: string
	description: string
	personality?: string
	loreEntries?: SelectCharacterLoreEntry[]
}

export type TemplateContextPersona = {
	name: string
	description: string
}

export type TemplateContext = {
	instructions: string
	characters: TemplateContextCharacter[] | string // can be JSON stringified
	personas: TemplateContextPersona[] | string // can be JSON stringified
	scenario: string
	wiBefore?: string
	wiAfter?: string
	chatMessages: any[]
	char: string
	character: string
	user: string
	persona: string
	worldLore?: string // changed to object
	characterLore?: SelectCharacterLoreEntry[]
	history?: string // changed to object
	currentDate?: string
	__promptBuilderInstance: PromptBuilder
}
