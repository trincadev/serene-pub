import { describe, it, expect } from "vitest"
import { LorebookMatcher, HistoryMatcher } from "$lib/server/utils/promptBuilder/ContentMatchers"

describe('LorebookMatcher', () => {
	const matcher = new LorebookMatcher()

	it('matches case-insensitive, non-regex keys', () => {
		const entry = {
			keys: 'dragon,castle',
			caseSensitive: false,
			useRegex: false
		}
		expect(matcher.matches('The dragon sleeps.', entry)).toBe(true)
		expect(matcher.matches('The castle is old.', entry)).toBe(true)
		expect(matcher.matches('The knight rides.', entry)).toBe(false)
	})

	it('matches case-sensitive, non-regex keys', () => {
		const entry = {
			keys: 'Dragon,Castle',
			caseSensitive: true,
			useRegex: false
		}
		expect(matcher.matches('Dragon flies.', entry)).toBe(true)
		expect(matcher.matches('dragon flies.', entry)).toBe(false)
	})

	it('matches case-insensitive, regex keys', () => {
		const entry = {
			keys: 'dra.*n,cas.*e',
			caseSensitive: false,
			useRegex: true
		}
		expect(matcher.matches('The dragon sleeps.', entry)).toBe(true)
		expect(matcher.matches('The castle is old.', entry)).toBe(true)
		expect(matcher.matches('The knight rides.', entry)).toBe(false)
	})

	it('matches case-sensitive, regex keys', () => {
		const entry = {
			keys: 'Dra.*n,Cas.*e',
			caseSensitive: true,
			useRegex: true
		}
		expect(matcher.matches('Dragon sleeps.', entry)).toBe(true)
		expect(matcher.matches('dragon sleeps.', entry)).toBe(false)
	})
})

describe('HistoryMatcher', () => {
	const matcher = new HistoryMatcher()

	it('matches case-insensitive, non-regex keys', () => {
		const entry = {
			keys: 'battle,hero',
			caseSensitive: false,
			useRegex: false
		}
		expect(matcher.matches('The hero won the battle.', entry)).toBe(true)
		expect(matcher.matches('A peaceful day.', entry)).toBe(false)
	})

	it('matches case-sensitive, non-regex keys', () => {
		const entry = {
			keys: 'Battle,Hero',
			caseSensitive: true,
			useRegex: false
		}
		expect(matcher.matches('Battle begins.', entry)).toBe(true)
		expect(matcher.matches('battle begins.', entry)).toBe(false)
	})

	it('matches case-insensitive, regex keys', () => {
		const entry = {
			keys: 'bat.*e,her.*o',
			caseSensitive: false,
			useRegex: true
		}
		expect(matcher.matches('The hero won the battle.', entry)).toBe(true)
		expect(matcher.matches('A peaceful day.', entry)).toBe(false)
	})

	it('matches case-sensitive, regex keys', () => {
		const entry = {
			keys: 'Bat.*e,Her.*o',
			caseSensitive: true,
			useRegex: true
		}
		expect(matcher.matches('Battle begins.', entry)).toBe(true)
		expect(matcher.matches('battle begins.', entry)).toBe(false)
	})
})