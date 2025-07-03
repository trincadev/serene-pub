import { PromptBlockFormatter } from "../PromptBlockFormatter"
import Handlebars from "handlebars"
import type { TokenCounters } from "../TokenCounterManager"
import type { BasePromptChat } from "../../connectionAdapters/BaseConnectionAdapter"
import {
	attachCharacterLoreToCharacters,
	populateLorebookEntryBindings
} from "./LorebookBindingUtils"
import {
	characterLoreEntryIterator,
	historyEntryIterator
} from "./PromptIterators"
import { PromptFormats } from "$lib/shared/constants/PromptFormats"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { character } from "$lib/server/sockets/characters"

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
		this.tokenCounter = tokenCounter
		this.tokenLimit = tokenLimit
		this.contextThresholdPercent = contextThresholdPercent
	}

	private registerHandlebarsHelpers({
		useChatFormat = false
	}: {
		useChatFormat?: boolean
	}) {
		const handlebars = this.handlebars

		// Common helpers
		if (!handlebars.helpers.eq)
			handlebars.registerHelper("eq", (a, b) => a === b)
		if (!handlebars.helpers.ne)
			handlebars.registerHelper("ne", (a, b) => a !== b)
		if (!handlebars.helpers.and)
			handlebars.registerHelper("and", (a, b) => a && b)
		if (!handlebars.helpers.or)
			handlebars.registerHelper("or", (a, b) => a || b)

		// Precompute prompt format ONCE for this registration
		const precomputedPromptFormat = useChatFormat
			? PromptFormats.SPLIT_CHAT
			: this.connection?.promptFormat || PromptFormats.VICUNA

		const getPromptFormat = () => precomputedPromptFormat

		if (!handlebars.helpers.systemBlock) {
			handlebars.registerHelper(
				"systemBlock",
				function (this: any, options: any) {
					const promptFormat = getPromptFormat()
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
					const promptFormat = getPromptFormat()
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
					const promptFormat = getPromptFormat()
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
	private async infillContent({
		templateContext,
		charName,
		personaName,
		useChatFormat
	}: {
		templateContext: TemplateContext
		charName: string
		personaName: string
		useChatFormat: boolean
	}): Promise<{
		renderedPrompt: string | undefined
		renderedMessages: ChatCompletionMessageParam[] | undefined
		totalTokens: number
		chatMessages: {
			included: number
			includedIds: number[]
			excludedIds: number[]
		}
	}> {
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
		let characterLoreIter:
			| IterableIterator<SelectCharacterLoreEntry>
			| undefined
			| null
		let historyEntryIter:
			| IterableIterator<SelectHistoryEntry>
			| undefined
			| null
		let consideredWorldLoreEntries: SelectWorldLoreEntry[] = []
		let consideredCharacterLoreEntries: SelectCharacterLoreEntry[] = []
		let consideredHistoryEntries: SelectHistoryEntry[] = []
		const messageFailedWorldLoreMatches: Record<number, number[]> = {}
		const messageFailedCharacterLoreMatches: Record<number, number[]> = {}
		const messageFailedHistoryMatches: Record<number, number[]> = {}

		let chatMessages: {
			id: number
			role: "assistant" | "user"
			name: string
			message: string | undefined
		}[] = [
			{
				id: -2, // Placeholder for the current character's empty message
				role: "assistant",
				name: charName, // Only the placeholder uses the current character's name
				message: ""
			}
		]
		let includedChatMessages = 0
		let includedChatMessageIds: number[] = []
		let excludedChatMessageIds: number[] = []
		// Precompiled prompt
		let renderedPrompt: string | { role: string; content: string }[] = ""
		// OpenAI chat format
		let renderedMessages: ChatCompletionMessageParam[] | undefined
		let totalTokens = 0

		// Ensure interpolationContext is available
		const interpolationContext = {
			char: charName,
			character: charName,
			user: personaName,
			persona: personaName
		}

		let isBelowThreshold = true
		let isAboveThreshold = false
		let isOverLimit = false

		// --- DEBUG: Start timing ---
		const debugTimings: any[] = []

		let iterationCount = 0
		while (!completed) {
			iterationCount++
			const iterStart = Date.now()
			switch (priority) {
				case 4:
					if (messagesIterator === undefined) {
						messagesIterator = this.chatMessageIterator({
							priority
						})
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreIter = characterLoreEntryIterator({
							chat: this.chat,
							priority
						})
						historyEntryIter = historyEntryIterator({
							chat: this.chat,
							priority
						})
					} else if (
						messagesIterator === null &&
						worldLoreEntryIterator === null &&
						characterLoreIter === null &&
						historyEntryIter === null
					) {
						priority = 3
						continue
					}
					break
				case 3:
					if (
						messagesIterator === null &&
						characterLoreIter === null &&
						worldLoreEntryIterator === null
					) {
						messagesIterator = this.chatMessageIterator({
							priority
						})
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreIter = characterLoreEntryIterator({
							chat: this.chat,
							priority
						})
						priority = 2
					}
					break
				case 2:
					if (
						historyEntryIter === null &&
						characterLoreIter === null &&
						worldLoreEntryIterator === null &&
						messagesIterator === null
					) {
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreIter = characterLoreEntryIterator({
							chat: this.chat,
							priority
						})
						historyEntryIter = historyEntryIterator({
							chat: this.chat,
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
						characterLoreIter === null &&
						worldLoreEntryIterator === null
					) {
						worldLoreEntryIterator = this.worldLoreEntryIterator({
							priority
						})
						characterLoreIter = characterLoreEntryIterator({
							chat: this.chat,
							priority
						})
						priority = 0
					}
					break
				case 0:
					if (
						historyEntryIter === null &&
						characterLoreIter === null &&
						worldLoreEntryIterator === null &&
						messagesIterator === null
					) {
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
					nextWorldLoreEntryVal = worldLoreEntryIterator?.next()
					nextCharacterLoreEntryVal = characterLoreIter?.next()
					nextHistoryEntryVal = historyEntryIter?.next()
				}

				// MESSAGES
				if (!nextMessageVal || nextMessageVal.done) {
					messagesIterator = null
				} else if (nextMessageVal.value && !isOverLimit) {
					// Normalize message structure
					const msg = nextMessageVal.value
					let msgInterpolationContext = { ...interpolationContext }
					let assistantName = charName
					let userName = personaName
					if (msg.characterId && this.chat.chatCharacters) {
						const foundChar = this.chat.chatCharacters.find(
							(cc) => cc.character.id === msg.characterId
						)?.character
						let foundName: string | undefined
						if (foundChar) {
							foundName = foundChar.nickname || foundChar.name
						}
						if (msg.role === "assistant") {
							assistantName = foundName || charName
						}
						msgInterpolationContext = {
							...msgInterpolationContext,
							char: foundName || charName,
							character: foundName || charName
						}
					}
					if (msg.personaId && this.chat.chatPersonas) {
						const foundPersona = this.chat.chatPersonas.find(
							(cp) => cp.persona.id === msg.personaId
						)?.persona
						if (foundPersona) {
							userName = foundPersona.name
							msgInterpolationContext = {
								...msgInterpolationContext,
								user: userName,
								persona: userName
							}
						}
					}
					const interpolate = (str: string | undefined) =>
						str ? this.handlebars.compile(str)(msgInterpolationContext) : str
					chatMessages.push({
						id: msg.id,
						role:
							msg.role === "user" || msg.role === "assistant"
								? msg.role
								: "assistant",
						name: msg.role === "assistant" ? assistantName : userName, // Use correct name for each assistant message
						message: interpolate(msg.content)
					})
				}

				if (isBelowThreshold) {
					// WORLD LORE ENTRIES
					if (!nextWorldLoreEntryVal || nextWorldLoreEntryVal.done) {
						worldLoreEntryIterator = null
					} else if (nextWorldLoreEntryVal.value && priority === 4) {
						this.includedWorldLoreEntries.push(
							populateLorebookEntryBindings(
								nextWorldLoreEntryVal.value,
								this.chat
							)
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
						characterLoreIter = null
					} else if (
						nextCharacterLoreEntryVal.value &&
						priority === 4
					) {
						this.includedCharacterLoreEntries.push(
							populateLorebookEntryBindings(
								nextCharacterLoreEntryVal.value,
								this.chat
							)
						)
					} else if (nextCharacterLoreEntryVal.value) {
						consideredCharacterLoreEntries.push(
							nextCharacterLoreEntryVal.value
						)
					}

					// HISTORY ENTRIES
					if (!nextHistoryEntryVal || nextHistoryEntryVal.done) {
						historyEntryIter = null
					} else if (nextHistoryEntryVal.value && priority === 4) {
						if (isHistoryEntry(nextHistoryEntryVal.value)) {
							const populated = populateLorebookEntryBindings(
								nextHistoryEntryVal.value,
								this.chat
							)
							if ("date" in populated) {
								this.includedHistoryEntries.push(
									populated as SelectHistoryEntry
								)
							}
						}
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
							let matchFound = entry.keys
								.split(",")
								.some((key) => {
									const keyToCheck = entry.caseSensitive
										? key.trim()
										: key.toLowerCase().trim()
									if (entry.useRegex) {
										const regex = new RegExp(
											keyToCheck,
											"g"
										)
										return regex.test(msgContent)
									} else {
										return msgContent.includes(keyToCheck)
									}
								})
							if (matchFound) {
								this.includedWorldLoreEntries.push(
									populateLorebookEntryBindings(
										entry,
										this.chat
									)
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
							let matchFound = entry.keys
								.split(",")
								.some((key) => {
									const keyToCheck = entry.caseSensitive
										? key.trim()
										: key.toLowerCase().trim()
									if (entry.useRegex) {
										const regex = new RegExp(
											keyToCheck,
											"g"
										)
										return regex.test(msgContent)
									} else {
										return msgContent.includes(keyToCheck)
									}
								})
							if (matchFound) {
								this.includedCharacterLoreEntries.push(
									populateLorebookEntryBindings(
										entry,
										this.chat
									)
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
							let matchFound = entry.keys
								.split(",")
								.some((key) => {
									const keyToCheck = entry.caseSensitive
										? key
										: key.toLowerCase()
									if (entry.useRegex) {
										const regex = new RegExp(
											keyToCheck,
											"g"
										)
										return regex.test(msgContent)
									} else {
										return msgContent.includes(keyToCheck)
									}
								})
							if (matchFound) {
								if (isHistoryEntry(entry)) {
									const populated =
										populateLorebookEntryBindings(
											entry,
											this.chat
										)
									if ("date" in populated) {
										this.includedHistoryEntries.push(
											populated as SelectHistoryEntry
										)
									}
								}
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
			const assistantCharactersWithLore = attachCharacterLoreToCharacters(
				assistantCharacters,
				this.includedCharacterLoreEntries,
				this.chat
			)
			const charactersInterpolated = JSON.stringify(
				assistantCharactersWithLore,
				null,
				2
			)
			const userCharactersWithLore = attachCharacterLoreToCharacters(
				this.getInterpolatedPersonas(interpolationContext),
				this.includedCharacterLoreEntries,
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
			templateContext.characterLore = this.includedCharacterLoreEntries

			const worldLoreObj: Record<string, string> = {}
			for (const entry of this.includedWorldLoreEntries) {
				if (entry && entry.name && entry.content) {
					worldLoreObj[entry.name] = entry.content
				}
			}
			templateContext.worldLore = Object.keys(worldLoreObj).length
				? JSON.stringify(worldLoreObj, null, 2)
				: undefined

			const historyObj: Record<string, string> = {}
			this.includedHistoryEntries.forEach((entry) => {
				if (entry.content.trim()) {
					// Only populate bindings if the entry has the required lorebook fields
					let populatedEntry = entry
					if ((entry as any).name && (entry as any).keys) {
						const lorePopulated = populateLorebookEntryBindings(
							entry as any,
							this.chat
						)
						if (
							lorePopulated &&
							typeof lorePopulated.content === "string"
						) {
							populatedEntry = {
								...entry,
								content: lorePopulated.content
							}
						}
					}
					// Format date as year-month-day, year-month, or year only
					const y = populatedEntry.year
					const m = populatedEntry.month
					const d = populatedEntry.day
					let dateKey = String(y)
					if (m !== undefined && m !== null)
						dateKey += `-${String(m).padStart(2, "0")}`
					if (d !== undefined && d !== null)
						dateKey += `-${String(d).padStart(2, "0")}`
					historyObj[dateKey] = populatedEntry.content
				}
			})
			let mostRecentDate: {
				year: number
				month: number | undefined
				day: number | undefined
			} | null = null
			if (this.includedHistoryEntries.length) {
				mostRecentDate = {
					year: this.includedHistoryEntries[0].year,
					month: !!this.includedHistoryEntries[0].month
						? this.includedHistoryEntries[0].month
						: undefined,
					day: !!this.includedHistoryEntries[0].day
						? this.includedHistoryEntries[0].day
						: undefined
				}
			}
			// Format currentDate as year-month-day, year-month, or year only
			if (mostRecentDate) {
				const y = mostRecentDate.year
				const m = mostRecentDate.month
				const d = mostRecentDate.day
				let dateKey = String(y)
				if (m !== undefined && m !== null)
					dateKey += `-${String(m).padStart(2, "0")}`
				if (d !== undefined && d !== null)
					dateKey += `-${String(d).padStart(2, "0")}`
				templateContext.currentDate = dateKey
			} else {
				templateContext.currentDate = undefined
			}
			templateContext.history = Object.keys(historyObj).length
				? JSON.stringify(historyObj)
				: undefined

			// --- Over-limit logic: remove last non-placeholder message and re-count tokens ---
			if (isOverLimit) {
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
			if (
				(priority !== 4 && iterationCount % iterationRate === 0) ||
				isOverLimit
			) {
				includedChatMessages = chatMessages.length - 1 // Exclude the last empty message
				includedChatMessageIds = chatMessages
					.filter((m) => m.id !== -2)
					.map((m) => m.id)

				// --- Render and count tokens ---
				renderedPrompt = this.handlebars.compile(
					this.contextConfig.template
				)({
					...templateContext,
					chatMessages: [...chatMessages].reverse()
				})
				if (useChatFormat) {
					renderedMessages = parseSplitChatPrompt(renderedPrompt)
					renderedPrompt = JSON.stringify(renderedMessages)
				}
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

			if (isOverLimit && totalTokens <= this.tokenLimit) {
				completed = true
			}
		}

		
		////
		// FINAL COMPILE
		///

		// Recalculate included/excluded message counts and token count based on final prompt/messages
		includedChatMessages = chatMessages.length - 1 // Exclude the last empty message
		includedChatMessageIds = chatMessages
			.filter((m) => m.id !== -2)
			.map((m) => m.id)
		// Excluded IDs are those in the original chat that are not included
		excludedChatMessageIds = (this.chat.chatMessages || [])
			.map((m) => m.id)
			.filter((id) => !includedChatMessageIds.includes(id))

		renderedPrompt = this.handlebars.compile(this.contextConfig.template)({
			...templateContext,
			chatMessages: [...chatMessages].reverse()
		})

		if (useChatFormat) {
			renderedMessages = parseSplitChatPrompt(renderedPrompt)
			renderedPrompt = JSON.stringify(renderedMessages)
		}

		// Recount tokens for the final prompt
		totalTokens =
			typeof this.tokenCounter.countTokens === "function"
				? await this.tokenCounter.countTokens(renderedPrompt)
				: 0

		return {
			renderedPrompt: !useChatFormat ? renderedPrompt : undefined,
			renderedMessages,
			totalTokens,
			chatMessages: {
				included: includedChatMessages,
				includedIds: includedChatMessageIds,
				excludedIds: excludedChatMessageIds
			}
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
	private buildMeta({
		excludedIds,
		useChatFormat = false
	}: {
		excludedIds: number[]
		useChatFormat?: boolean
	}) {
		return {
			promptFormat: useChatFormat
				? "N/A - Chat Completions"
				: (this.connection.promptFormat || "").toLowerCase(),
			templateName: this.contextConfig?.name || null,
			timestamp: new Date().toISOString(),
			truncationReason: excludedIds.length ? "token_limit" : null,
			currentTurnCharacterId: this.currentCharacterId
		}
	}

	// --- Main compilePrompt ---
	async compilePrompt({
		useChatFormat = false
	}: {
		useChatFormat?: boolean
	}): Promise<CompiledPrompt> {
		this.registerHandlebarsHelpers({ useChatFormat })
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
		const assistantCharactersWithLore = attachCharacterLoreToCharacters(
			assistantCharacters,
			this.includedCharacterLoreEntries,
			this.chat
		)
		const charactersInterpolated = JSON.stringify(
			assistantCharactersWithLore,
			null,
			2
		)
		const userCharactersWithLore = attachCharacterLoreToCharacters(
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
			renderedMessages,
			totalTokens,
			chatMessages: {
				included: includedChatMessages,
				includedIds,
				excludedIds
			}
		} = await this.infillContent({
			templateContext,
			charName,
			personaName,
			useChatFormat
		})

		const sources = this.buildSources(scenarioSource)
		const meta = this.buildMeta({
			excludedIds,
			useChatFormat
		})

		// --- Lorebook entry totals ---
		const lorebook = this.chat.lorebook
		let worldLoreTotal = 0
		let characterLoreTotal = 0
		let historyTotal = 0
		if (hasLorebookEntries(lorebook)) {
			worldLoreTotal = lorebook.worldLoreEntries.length
			characterLoreTotal = lorebook.characterLoreEntries.length
			historyTotal = lorebook.historyEntries.length
		}

		// console.log("Prompt messages:" + JSON.stringify(renderedMessages))

		// Default: return as before
		return {
			prompt: renderedPrompt,
			messages: renderedMessages,
			meta: {
				...meta,
				tokenCounts: {
					total: totalTokens as number,
					limit: this.tokenLimit
				},
				chatMessages: {
					included: includedChatMessages,
					total: this.chat.chatMessages.length,
					includedIds,
					excludedIds
				},
				sources
			}
		}
	}

	attachCharacterLoreToPersonas(
		arg0: any[],
		includedCharacterLoreEntries: {
			id: number
			name: string | null
			extraJson: Record<string, any>
			createdAt: string | null
			updatedAt: string | null
			lorebookId: number
			keys: string
			useRegex: boolean | null
			caseSensitive: boolean
			content: string
			constant: boolean
			enabled: boolean
			position: number
			priority: number
			lorebookBindingId: number | null
		}[],
		chat: BasePromptChat
	) {
		throw new Error("Method not implemented.")
	}

	*chatMessageIterator({
		priority
	}: {
		priority: number
	}): IterableIterator<SelectChatMessage> {
		const messages = this.chat.chatMessages || []
		if (priority === 4) {
			// If there are 3 or fewer messages, yield all in reverse order
			if (messages.length <= 3) {
				for (const msg of messages.slice().reverse()) {
					yield msg
				}
			} else {
				for (const msg of messages.slice(-3).reverse()) {
					yield msg
				}
			}
		} else if (priority === 2) {
			// If there are 3 or fewer messages, yield none
			if (messages.length <= 3) {
				// yield nothing
			} else {
				for (const msg of messages.slice(0, -3).reverse()) {
					yield msg
				}
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
}

// --- Types for template context ---
export type TemplateContextCharacter = {
	name: string
	nickname?: string
	description: string
	personality?: string
	loreEntries?: SelectCharacterLoreEntry[]
	category?: string
	lorebookBindingId?: number | null
	year?: number
	month?: number
	day?: number
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

function isHistoryEntry(entry: any): entry is SelectHistoryEntry {
	return entry && typeof entry === "object" && "date" in entry
}

function parseSplitChatPrompt(prompt: string): ChatCompletionMessageParam[] {
	const blocks = prompt.split(/(?=<@role:(user|assistant|system)>\s*)/g)
	// TODO: populate the name param, but local models may ignore it anyway
	const messages = blocks
		.map((block) => {
			const match = block.match(
				/^<@role:(user|assistant|system)>\s*([\s\S]*)$/
			)
			return match ? { role: match[1], content: match[2].trim() } : null
		})
		.filter(Boolean)

	return messages as ChatCompletionMessageParam[]
}

// Helper type guard for extended lorebook
function hasLorebookEntries(lorebook: any): lorebook is SelectLorebook & {
	worldLoreEntries: SelectWorldLoreEntry[]
	characterLoreEntries: SelectCharacterLoreEntry[]
	historyEntries: SelectHistoryEntry[]
} {
	return (
		lorebook &&
		Array.isArray(lorebook.worldLoreEntries) &&
		Array.isArray(lorebook.characterLoreEntries) &&
		Array.isArray(lorebook.historyEntries)
	)
}
