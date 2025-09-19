import { describe, it, expect, vi } from "vitest"
import {

ChatMessageProcessor,
WorldLoreProcessor,
CharacterLoreProcessor,
HistoryEntryProcessor,
LoreMatchingEngine,
} from "$lib/server/utils/promptBuilder/ContentProcessors"

describe("ChatMessageProcessor", () => {
it("processes chat message with correct role and name", () => {
	const interpolateString = vi.fn((content, ctx) => `interpolated:${content}`)
	const interpolationEngine = { interpolateString }
	const chat = {
		chatCharacters: [
			{ character: { id: 1, name: "CharA", nickname: "NickA" } },
		],
		chatPersonas: [
			{ persona: { id: 2, name: "PersonaB" } },
		],
	}
	const processor = new ChatMessageProcessor(chat, interpolationEngine)
	const message = {
		id: 42,
		role: "assistant",
		content: "Hello, {char}",
		characterId: 1,
		personaId: 2,
	}
	const context = {
		interpolationContext: {},
		charName: "DefaultChar",
		personaName: "DefaultPersona",
		priority: 1,
	}
	const result = processor.processItem(message, context)
	expect(result).toEqual({
		id: 42,
		role: "assistant",
		name: "NickA",
		message: "interpolated:Hello, {char}",
	})
})

it("shouldInclude always returns true", () => {
	const processor = new ChatMessageProcessor({}, { interpolateString: vi.fn() })
	expect(processor.shouldInclude({} as any, 1)).toBe(true)
})
})

describe("WorldLoreProcessor", () => {
it("processItem calls populateLorebookEntryBindings", () => {
	const entry = { id: 1 }
	const chat = {}
	const populateLorebookEntryBindings = vi.fn((e, c) => ({ ...e, populated: true }))
	const processor = new WorldLoreProcessor(chat, populateLorebookEntryBindings)
	const result = processor.processItem(entry, {
		interpolationContext: {},
		charName: "",
		personaName: "",
		priority: 1,
	})
	expect(result).toEqual({ id: 1, populated: true })
	expect(populateLorebookEntryBindings).toHaveBeenCalledWith(entry, chat)
})

it("shouldInclude returns true for priority 4", () => {
	const processor = new WorldLoreProcessor({}, vi.fn())
	expect(processor.shouldInclude({} as any, 4)).toBe(true)
})

it("shouldInclude returns true for other priorities", () => {
	const processor = new WorldLoreProcessor({}, vi.fn())
	expect(processor.shouldInclude({} as any, 1)).toBe(true)
})
})

describe("CharacterLoreProcessor", () => {
it("processItem calls populateLorebookEntryBindings", () => {
	const entry = { id: 2 }
	const chat = {}
	const populateLorebookEntryBindings = vi.fn((e, c) => ({ ...e, populated: true }))
	const processor = new CharacterLoreProcessor(chat, populateLorebookEntryBindings)
	const result = processor.processItem(entry, {
		interpolationContext: {},
		charName: "",
		personaName: "",
		priority: 1,
	})
	expect(result).toEqual({ id: 2, populated: true })
	expect(populateLorebookEntryBindings).toHaveBeenCalledWith(entry, chat)
})

it("shouldInclude returns true for priority 4", () => {
	const processor = new CharacterLoreProcessor({}, vi.fn())
	expect(processor.shouldInclude({} as any, 4)).toBe(true)
})

it("shouldInclude returns true for other priorities", () => {
	const processor = new CharacterLoreProcessor({}, vi.fn())
	expect(processor.shouldInclude({} as any, 1)).toBe(true)
})
})

describe("HistoryEntryProcessor", () => {
it("processItem returns null if not a history entry", () => {
	const chat = {}
	const populateLorebookEntryBindings = vi.fn()
	const isHistoryEntry = vi.fn(() => false)
	const processor = new HistoryEntryProcessor(chat, populateLorebookEntryBindings, isHistoryEntry)
	const result = processor.processItem({ id: 3 }, {
		interpolationContext: {},
		charName: "",
		personaName: "",
		priority: 1,
	})
	expect(result).toBeNull()
})

it("processItem returns entry if populated and has date", () => {
	const chat = {}
	const entry = { id: 3, date: "2024-01-01" }
	const populateLorebookEntryBindings = vi.fn(() => ({ ...entry }))
	const isHistoryEntry = vi.fn(() => true)
	const processor = new HistoryEntryProcessor(chat, populateLorebookEntryBindings, isHistoryEntry)
	const result = processor.processItem(entry, {
		interpolationContext: {},
		charName: "",
		personaName: "",
		priority: 1,
	})
	expect(result).toEqual(entry)
})

it("processItem returns null if populated entry has no date", () => {
	const chat = {}
	const entry = { id: 3 }
	const populateLorebookEntryBindings = vi.fn(() => ({ id: 3 }))
	const isHistoryEntry = vi.fn(() => true)
	const processor = new HistoryEntryProcessor(chat, populateLorebookEntryBindings, isHistoryEntry)
	const result = processor.processItem(entry, {
		interpolationContext: {},
		charName: "",
		personaName: "",
		priority: 1,
	})
	expect(result).toBeNull()
})

it("shouldInclude returns true for priority 4", () => {
	const processor = new HistoryEntryProcessor({}, vi.fn(), vi.fn())
	expect(processor.shouldInclude({} as any, 4)).toBe(true)
})

it("shouldInclude returns true if entry has year", () => {
	const processor = new HistoryEntryProcessor({}, vi.fn(), vi.fn())
	expect(processor.shouldInclude({ year: 2020 } as any, 1)).toBe(true)
})

it("shouldInclude returns false if entry has no year", () => {
	const processor = new HistoryEntryProcessor({}, vi.fn(), vi.fn())
	expect(processor.shouldInclude({ year: undefined } as any, 1)).toBe(false)
})
})

describe("LoreMatchingEngine", () => {
it("setStrategy updates strategy", async () => {
	const strategyA = { getName: () => "A", matchesMessage: vi.fn(async () => true) }
	const strategyB = { getName: () => "B", matchesMessage: vi.fn(async () => false) }
	const engine = new LoreMatchingEngine(strategyA)
	expect(engine.getStrategyName()).toBe("A")
	engine.setStrategy(strategyB)
	expect(engine.getStrategyName()).toBe("B")
})

it("matchesMessage delegates to strategy", async () => {
	const strategy = { getName: () => "S", matchesMessage: vi.fn(async () => true) }
	const engine = new LoreMatchingEngine(strategy)
	const entry = { id: 1 }
	const message = { id: 2, message: "msg" }
	const result = await engine.matchesMessage(entry, message)
	expect(result).toBe(true)
	expect(strategy.matchesMessage).toHaveBeenCalledWith(entry, message, undefined)
})

it("processMatching matches and processes entries", async () => {
	const strategy = {
		getName: () => "S",
		matchesMessage: vi.fn(async (entry, msg) => entry.id === msg.id),
	}
	const processor = {
		processItem: vi.fn((entry, ctx) => ({ ...entry, processed: true })),
		shouldInclude: vi.fn(() => true),
	}
	const engine = new LoreMatchingEngine(strategy)
	const chatMessages = [{ id: 1, message: "foo" }, { id: 2, message: "bar" }]
	const consideredEntries = [{ id: 1 }, { id: 3 }]
	const failedMatches = {}
	const context = {
		interpolationContext: {},
		charName: "",
		personaName: "",
		priority: 1,
	}
	const result = await engine.processMatching(
		chatMessages,
		consideredEntries,
		failedMatches,
		processor,
		context
	)
	expect(result.matched).toEqual([{ id: 1, processed: true }])
	expect(result.remaining).toEqual([{ id: 3 }])
})
})