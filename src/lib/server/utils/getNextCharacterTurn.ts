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
	const sortedCharacters = chat.chatCharacters
		.filter((cc) => cc.isActive)
		.slice()
		.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
	const personaIds = chat.chatPersonas.map((cp) => cp.persona.id)

	// Find the index of the last persona message
	let lastPersonaIdx = -1
	for (let i = chat.chatMessages.length - 1; i >= 0; --i) {
		const msg = chat.chatMessages[i]
		if (msg.role === "user" && personaIds.includes(msg.personaId ?? -1)) {
			lastPersonaIdx = i
			break
		}
	}

	// Pool of messages since the last persona message (exclusive)
	const pool = chat.chatMessages.slice(lastPersonaIdx + 1)

	if (!triggered) {
		// For each character in order, check if they have a message in the pool
		for (const cc of sortedCharacters) {
			const hasMessage = pool.some(
				(msg) =>
					msg.role === "assistant" &&
					msg.characterId === cc.character.id
			)
			if (!hasMessage) {
				return cc.character.id
			}
		}
		return null
	} else {
		// For triggered: has the character replied within character.position of the most recent messages?
		for (const cc of sortedCharacters) {
			const recentPool = pool.slice(-1 * (cc.position ?? 1))
			const hasRecentReply = recentPool.some(
				(msg) =>
					msg.role === "assistant" &&
					msg.characterId === cc.character.id
			)
			if (!hasRecentReply) {
				return cc.character.id
			}
		}
		// If all have replied, default to the first character
		return sortedCharacters[0].character.id
	}
}
