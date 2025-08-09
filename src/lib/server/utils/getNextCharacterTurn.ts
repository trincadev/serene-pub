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
	console.log("Debug - getNextCharacterTurn called with:", {
		charactersLength: chat.chatCharacters?.length,
		personasLength: chat.chatPersonas?.length,
		triggered
	})

	if (!chat.chatCharacters?.length || !chat.chatPersonas?.length) {
		console.log(
			"Debug - getNextCharacterTurn early return: no characters or personas"
		)
		return null
	}

	// Validate input data
	if (!chat.chatCharacters?.every((cc) => cc.character?.id)) {
		console.error(
			"Debug - Invalid character data detected:",
			chat.chatCharacters?.map((cc) => ({
				hasCharacter: !!cc.character,
				characterId: cc.character?.id
			}))
		)
	}

	// Ensure positions are consistent
	const positions = chat.chatCharacters
		.map((cc) => cc.position)
		.filter((p) => p !== null && p !== undefined)
	const hasDuplicatePositions = positions.length !== new Set(positions).size
	if (hasDuplicatePositions) {
		console.warn("Debug - Duplicate positions detected:", positions)
	}

	// Sort ALL characters by position first with normalization, then filter active ones while preserving order
	const allCharactersSorted = chat.chatCharacters
		.slice()
		.map((cc, index) => ({
			...cc,
			normalizedPosition: cc.position ?? index
		}))
		.sort((a, b) => a.normalizedPosition - b.normalizedPosition)

	const activeCharacters = allCharactersSorted.filter((cc) => cc.isActive)

	console.log("Debug - Active characters filtering:", {
		totalCharacters: allCharactersSorted.length,
		activeCharacters: activeCharacters.length,
		activeCharacterIds: activeCharacters.map((cc) => cc.character.id)
	})

	console.log("Debug - Character positions and activity:", {
		characters: activeCharacters.map((cc) => ({
			id: cc.character.id,
			name: cc.character.name,
			position: cc.position,
			normalizedPosition: cc.normalizedPosition,
			isActive: cc.isActive
		})),
		poolSize: 0, // Will be set after pool calculation
		lastPersonaIdx: -1, // Will be set after calculation
		triggered
	})

	// If no active characters, return null
	if (activeCharacters.length === 0) {
		console.log("Debug - getNextCharacterTurn: no active characters")
		return null
	}

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

	console.log("Debug - Message pool analysis:", {
		lastPersonaIdx,
		poolSize: pool.length,
		totalMessages: chat.chatMessages.length
	})

	if (!triggered) {
		// Round-robin: find first active character who hasn't replied since last user message
		for (const cc of activeCharacters) {
			const hasMessage = pool.some(
				(msg) =>
					msg.role === "assistant" &&
					msg.characterId === cc.character.id
			)
			console.log(
				`Debug - Checking character ${cc.character.name} (ID: ${cc.character.id}): hasMessage=${hasMessage}`
			)
			if (!hasMessage) {
				return cc.character.id
			}
		}

		// If all active characters have replied, start over with first active character
		console.log(
			"Debug - All characters have replied, cycling back to first"
		)
		return activeCharacters[0]?.character.id || null
	} else {
		// For triggered: check if each character has replied since the last user message
		for (const cc of activeCharacters) {
			const hasRecentReply = pool.some(
				(msg) =>
					msg.role === "assistant" &&
					msg.characterId === cc.character.id
			)
			console.log(
				`Debug - Triggered mode - Checking character ${cc.character.name} (ID: ${cc.character.id}): hasRecentReply=${hasRecentReply}`
			)
			if (!hasRecentReply) {
				return cc.character.id
			}
		}
		// If all have replied, default to the first active character
		console.log(
			"Debug - Triggered mode - All characters have replied, defaulting to first"
		)
		return activeCharacters[0]?.character.id || null
	}
}
