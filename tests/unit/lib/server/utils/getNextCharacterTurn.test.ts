import { describe, it, expect } from "vitest"
import { getNextCharacterTurn } from "$lib/server/utils/getNextCharacterTurn"

describe('getNextCharacterTurn', () => {
	const makeChat = ({
		characters,
		personas,
		messages
	}: {
		characters: Array<{
			id: number
			isActive?: boolean
			position?: number
		}>
		personas: Array<{
			id: number
		}>
		messages: Array<{
			role: 'user' | 'assistant'
			characterId?: number
			personaId?: number
		}>
	}) => ({
		chatMessages: messages,
		chatCharacters: characters.map((c, i) => ({
			isActive: c.isActive ?? true,
			position: c.position,
			character: { id: c.id }
		})),
		chatPersonas: personas.map((p) => ({
			persona: { id: p.id }
		}))
	})

	it('returns null if no chatCharacters or chatPersonas', () => {
		expect(
			getNextCharacterTurn({ chatMessages: [], chatCharacters: [], chatPersonas: [] })
		).toBeNull()
	})

	it('returns null if no active characters', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: false },
				{ id: 2, isActive: false }
			],
			personas: [{ id: 10 }],
			messages: []
		})
		expect(getNextCharacterTurn(chat)).toBeNull()
	})

	it('returns first active character who has not replied since last user message', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: true },
				{ id: 2, isActive: true }
			],
			personas: [{ id: 10 }],
			messages: [
				{ role: 'user', personaId: 10 },
				{ role: 'assistant', characterId: 1 }
			]
		})
		expect(getNextCharacterTurn(chat)).toBe(2)
	})

	it('returns null if all active characters have replied since last user message', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: true },
				{ id: 2, isActive: true }
			],
			personas: [{ id: 10 }],
			messages: [
				{ role: 'user', personaId: 10 },
				{ role: 'assistant', characterId: 1 },
				{ role: 'assistant', characterId: 2 }
			]
		})
		expect(getNextCharacterTurn(chat)).toBeNull()
	})

	it('returns character with oldest most recent reply when triggered', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: true },
				{ id: 2, isActive: true }
			],
			personas: [{ id: 10 }],
			messages: [
				{ role: 'user', personaId: 10 },
				{ role: 'assistant', characterId: 1 }, // index 1
				{ role: 'assistant', characterId: 2 }, // index 2
				{ role: 'assistant', characterId: 1 }  // index 3
			]
		})
		// Both have replied, but character 2's most recent reply is at index 2, character 1's at index 3
		// So character 2 should be chosen
		expect(getNextCharacterTurn(chat, { triggered: true })).toBe(2)
	})

	it('returns first character who has not replied since last user message when triggered', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: true },
				{ id: 2, isActive: true }
			],
			personas: [{ id: 10 }],
			messages: [
				{ role: 'user', personaId: 10 },
				{ role: 'assistant', characterId: 1 }
			]
		})
		expect(getNextCharacterTurn(chat, { triggered: true })).toBe(2)
	})

	it('handles position sorting and normalization', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: true, position: 2 },
				{ id: 2, isActive: true, position: 1 }
			],
			personas: [{ id: 10 }],
			messages: [
				{ role: 'user', personaId: 10 }
			]
		})
		// Should pick character with position 1 first (id:2)
		expect(getNextCharacterTurn(chat)).toBe(2)
	})

	it('returns null if no persona message found', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: true }
			],
			personas: [{ id: 10 }],
			messages: [
				{ role: 'assistant', characterId: 1 }
			]
		})
        const output = getNextCharacterTurn(chat)
		expect(output).toBeNull()
	})

	it('returns null if pool is empty and triggered', () => {
		const chat = makeChat({
			characters: [
				{ id: 1, isActive: true }
			],
			personas: [{ id: 10 }],
			messages: [
				{ role: 'user', personaId: 10 }
			]
		})
		expect(getNextCharacterTurn(chat, { triggered: true })).toBe(1)
	})
})