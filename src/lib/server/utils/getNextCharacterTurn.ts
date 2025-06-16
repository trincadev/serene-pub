// Helper to determine which character's turn it is
export function getNextCharacterTurn(
	chat: {
		chatMessages: SelectChatMessage[]
		chatCharacters: (SelectChatCharacter & { character: SelectCharacter })[]
		chatPersonas: (SelectChatPersona & { persona: SelectPersona })[]
	},
	opts: { triggered?: boolean } = {}
): number | null {
	const { triggered = false } = opts
	if (!chat.chatCharacters?.length || !chat.chatPersonas?.length) return null

	// Sort characters by .position (lowest first)
	const sortedCharacters = [...chat.chatCharacters].sort(
		(a, b) => (a.position ?? 0) - (b.position ?? 0)
	)
	const characterIds = sortedCharacters.map((cc) => cc.character.id)
	const personaIds = chat.chatPersonas.map((cp) => cp.persona.id)

	// Find the last persona message index
	const lastPersonaIdx = [...chat.chatMessages]
		.reverse()
		.findIndex(
			(msg) =>
				msg.role === "user" && personaIds.includes(msg.personaId ?? -1)
		)
	const lastPersonaAbsIdx =
		lastPersonaIdx === -1
			? -1
			: chat.chatMessages.length - 1 - lastPersonaIdx

	// Collect all character replies since the last persona message
	const charsSincePersona = new Set<number>()
	for (let i = lastPersonaAbsIdx + 1; i < chat.chatMessages.length; ++i) {
		const msg = chat.chatMessages[i]
		if (
			msg.role === "assistant" &&
			msg.characterId &&
			characterIds.includes(msg.characterId)
		) {
			charsSincePersona.add(msg.characterId)
		}
	}

	// If all characters have replied since last persona
	if (charsSincePersona.size >= characterIds.length) {
		if (triggered) {
			// Cycle: return the first character in turn order
			return sortedCharacters[0]?.character.id ?? null
		}
		return null
	}

	// Find the next character in turn order who hasn't replied
	for (const cc of sortedCharacters) {
		if (!charsSincePersona.has(cc.character.id)) {
			if (triggered) return cc.character.id
			// If not triggered, only return if the last message was from a persona
			const lastMsg = chat.chatMessages[chat.chatMessages.length - 1]
			if (
				lastMsg &&
				lastMsg.role === "user" &&
				personaIds.includes(lastMsg.personaId ?? -1)
			) {
				return cc.character.id
			}
			return null
		}
	}
	return null
}
