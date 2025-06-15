import { PromptBlockFormatter } from "./PromptBlockFormatter"
import Handlebars from "handlebars"

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
	assistantCharacters: any[] = [];
	userCharacters: any[] = [];
	systemCtxData: Record<string, any> = {};
	instructions?: string;
	wiBefore?: string;
	wiAfter?: string;

	handlebars: typeof Handlebars;

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
	}) {
		this.connection = connection
		this.sampling = sampling
		this.contextConfig = contextConfig
		this.promptConfig = promptConfig
		this.chat = chat
		this.currentCharacterId = currentCharacterId
		this.handlebars = Handlebars.create();
		this.registerHandlebarsHelpers();
	}

	private registerHandlebarsHelpers() {
		const handlebars = this.handlebars;
		// Common helpers
		if (!handlebars.helpers.eq) {
			handlebars.registerHelper('eq', (a, b) => a === b);
		}
		if (!handlebars.helpers.ne) {
			handlebars.registerHelper('ne', (a, b) => a !== b);
		}
		if (!handlebars.helpers.and) {
			handlebars.registerHelper('and', (a, b) => a && b);
		}
		if (!handlebars.helpers.or) {
			handlebars.registerHelper('or', (a, b) => a || b);
		}

		// Helper to always get the root promptBuilder instance
		const getPromptBuilder = (ctx: any, options: any) =>
			options?.data?.root?.__promptBuilderInstance || ctx.__promptBuilderInstance;
		const getPromptFormat = (ctx: any, options: any) =>
			getPromptBuilder(ctx, options)?.connection?.promptFormat || 'chatml';

		if (!handlebars.helpers.systemBlock) {
			handlebars.registerHelper('systemBlock', function(this: any, options: any) {
				const promptFormat = getPromptFormat(this, options);
				return PromptBlockFormatter.makeBlock({
					format: promptFormat,
					role: 'system',
					content: options.fn(this)
				});
			});
		}
		if (!handlebars.helpers.assistantBlock) {
			handlebars.registerHelper('assistantBlock', function(this: any, options: any) {
				const promptFormat = getPromptFormat(this, options);
				return PromptBlockFormatter.makeBlock({
					format: promptFormat,
					role: 'assistant',
					content: options.fn(this)
				});
			});
		}
		if (!handlebars.helpers.userBlock) {
			handlebars.registerHelper('userBlock', function(this: any, options: any) {
				const promptFormat = getPromptFormat(this, options);
				return PromptBlockFormatter.makeBlock({
					format: promptFormat,
					role: 'user',
					content: options.fn(this)
				});
			});
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
		const name = character.nickname || character.name || "assistant";
		return {
			assistant: name,
			char: name,
			character: name,
			persona: "user",
			user: "user"
		};
	}

	buildContextData(currentCharacter: SelectCharacter) {
		const chatCharacters = this.chat.chatCharacters as (SelectChatCharacter & { character: SelectCharacter })[] | undefined;
		this.assistantCharacters = (chatCharacters || []).map((cc) => this.compileCharacterData(cc.character));
		this.userCharacters = (this.chat.chatPersonas || []).map((cp) => this.compilePersonaData(cp.persona));
		this.instructions = this.contextBuildSystemPrompt();
		this.wiBefore = this.contextBuildCharacterWiBefore();
		this.wiAfter = this.contextBuildCharacterWiAfter();
		this.systemCtxData = {
			assistant_characters: JSON.stringify(this.assistantCharacters),
			user_characters: JSON.stringify(this.userCharacters),
		};
	}

	// --- Prompt construction ---
	async compilePrompt(
		currentCharacterId: number,
		tokenCounter: { countTokens: (s: string) => number },
		tokenLimit: number = 2048,
		contextThresholdPercent: number = 0.9
	): Promise<[string, number, number, number, number]> {
		const chatCharacters = this.chat.chatCharacters as (SelectChatCharacter & { character: SelectCharacter })[] | undefined;
		const currentCharacter = chatCharacters?.find(
			(cc) => cc.character.id === currentCharacterId
		)?.character;
		if (!currentCharacter) {
			throw new Error(
				`compilePrompt: No character found with ID ${currentCharacterId}`
			);
		}

		// Build and assign context data as class properties
		this.buildContextData(currentCharacter);

		// Prepare a Handlebars context for interpolation
		const charName = currentCharacter.nickname || currentCharacter.name;
		const personaName = (this.chat.chatPersonas && this.chat.chatPersonas[0]?.persona?.name) || "user";
		const interpolationContext = {
			char: charName,
			character: charName,
			user: personaName,
			persona: personaName
		};

		// Prepare chatMessages for #each
		const chatMessages = this.chat.chatMessages
			.filter((msg: SelectChatMessage) => !msg.isHidden)
			.map((msg: SelectChatMessage) => ({
				role: msg.role,
				name: (msg.role === "assistant" ? charName : personaName),
				message: msg.content
			}));

		// Interpolate all dynamic fields using Handlebars
		const interpolate = (str: string | undefined) =>
			str ? this.handlebars.compile(str)(interpolationContext) : str;

		const instructions = interpolate(this.instructions);
		const scenarioInterpolated = interpolate(this.contextBuildCharacterScenario(currentCharacter) || "");
		const wiBefore = interpolate(this.wiBefore);
		const wiAfter = interpolate(this.wiAfter);

		// Interpolate assistant/user characters and personas descriptions
		const assistantCharacters = this.assistantCharacters.map((c: any) => ({
			...c,
			name: interpolate(c.name),
			nickname: interpolate(c.nickname),
			description: interpolate(c.description),
			personality: interpolate(c.personality)
		}));
		const userCharacters = this.userCharacters.map((p: any) => ({
			...p,
			name: interpolate(p.name),
			description: interpolate(p.description)
		}));

		const charactersInterpolated = JSON.stringify(assistantCharacters, null, 2);
		const personasInterpolated = JSON.stringify(userCharacters, null, 2);

		const templateContext: Record<string, any> = {
			instructions,
			characters: charactersInterpolated,
			personas: personasInterpolated,
			scenario: scenarioInterpolated,
			wiBefore,
			wiAfter,
			chatMessages,
			char: charName,
			character: charName,
			user: personaName,
			persona: personaName,
			__promptBuilderInstance: this
		};

		// Render the template using the instance's Handlebars
		let renderedPrompt = this.handlebars.compile(this.contextConfig.template)(templateContext);
		const totalTokens = tokenCounter.countTokens(renderedPrompt);

		// If chatml, append opening assistant block and {{char}}: at the end (no closing tag)
		if ((this.connection.promptFormat || '').toLowerCase() === 'chatml') {
			renderedPrompt = renderedPrompt.trimEnd() + `\n<|im_start|>assistant\n${charName}: `;
		}

		// Debug: Show template context and template string for troubleshooting
		// console.log("\n\nPromptBuilder Debug Context:", JSON.stringify(templateContext, null, 2));
		// console.log("\nPromptBuilder Template String:\n", contextTemplate);
		console.log("\n\nPromptBuilder Rendered Prompt:\n", renderedPrompt, "\n\n");

		// Defensive: If the rendered prompt is empty, log a warning and the context/template
		if (!renderedPrompt.trim()) {
			console.warn("PromptBuilder: Rendered prompt is empty! Check your template and context.");
			console.warn("Template context:", JSON.stringify(templateContext, null, 2));
			console.warn("Template string:\n", this.contextConfig.template);
		}

		return [
			renderedPrompt.trimEnd(),
			totalTokens,
			tokenLimit,
			chatMessages.length,
			this.chat.chatMessages.length
		];
	}
}

// Helper to determine which character's turn it is
export function getNextCharacterTurn(chat: {
	chatMessages: SelectChatMessage[];
	chatCharacters: (SelectChatCharacter & { character: SelectCharacter })[];
	chatPersonas: (SelectChatPersona & { persona: SelectPersona })[];
}, opts: { triggered?: boolean } = {}): number | null {
	const { triggered = false } = opts;
	if (!chat.chatCharacters?.length || !chat.chatPersonas?.length) return null;

	// Sort characters by .position (lowest first)
	const sortedCharacters = [...chat.chatCharacters].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
	const characterIds = sortedCharacters.map(cc => cc.character.id);
	const personaIds = chat.chatPersonas.map(cp => cp.persona.id);

	// Find the last persona message index
	const lastPersonaIdx = [...chat.chatMessages].reverse().findIndex(msg => msg.role === 'user' && personaIds.includes(msg.personaId ?? -1));
	const lastPersonaAbsIdx = lastPersonaIdx === -1 ? -1 : chat.chatMessages.length - 1 - lastPersonaIdx;

	// Collect all character replies since the last persona message
	const charsSincePersona = new Set<number>();
	for (let i = lastPersonaAbsIdx + 1; i < chat.chatMessages.length; ++i) {
		const msg = chat.chatMessages[i];
		if (msg.role === 'assistant' && msg.characterId && characterIds.includes(msg.characterId)) {
			charsSincePersona.add(msg.characterId);
		}
	}

	// If all characters have replied since last persona, return null
	if (charsSincePersona.size >= characterIds.length) return null;

	// Find the next character in turn order who hasn't replied
	for (const cc of sortedCharacters) {
		if (!charsSincePersona.has(cc.character.id)) {
			if (triggered) return cc.character.id;
			// If not triggered, only return if the last message was from a persona
			const lastMsg = chat.chatMessages[chat.chatMessages.length - 1];
			if (lastMsg && lastMsg.role === 'user' && personaIds.includes(lastMsg.personaId ?? -1)) {
				return cc.character.id;
			}
			return null;
		}
	}
	return null;
}