import { describe, it, expect, beforeEach } from "vitest"
import {
    KeywordMatchingStrategy,
    VectorMatchingStrategy,
    MatchingStrategyFactory,
} from "$lib/server/utils/promptBuilder/LoreMatchingStrategies"

const makeEntry = (overrides = {}) => ({
    id: 1,
    keys: "dragon,castle",
    caseSensitive: false,
    useRegex: false,
    ...overrides,
})

const makeMessage = (overrides = {}) => ({
    id: 100,
    message: "The dragon flew over the castle.",
    ...overrides,
})

describe("KeywordMatchingStrategy", () => {
    let strategy: KeywordMatchingStrategy

    beforeEach(() => {
        strategy = new KeywordMatchingStrategy()
    })

    it("returns true when a keyword matches", () => {
        const entry = makeEntry()
        const message = makeMessage()
        expect(strategy.matchesMessage(entry, message)).toBe(true)
    })

    it("returns false when no keyword matches", () => {
        const entry = makeEntry({ keys: "wizard,elf" })
        const message = makeMessage()
        expect(strategy.matchesMessage(entry, message)).toBe(false)
    })

    it("handles case sensitivity", () => {
        const entry = makeEntry({ keys: "DRAGON", caseSensitive: true })
        const message = makeMessage()
        expect(strategy.matchesMessage(entry, message)).toBe(false)
    })

    it("handles regex matching", () => {
        const entry = makeEntry({ keys: "dra.*n", useRegex: true })
        const message = makeMessage()
        expect(strategy.matchesMessage(entry, message)).toBe(true)
    })

    it("falls back to string matching on invalid regex", () => {
        const entry = makeEntry({ keys: "[", useRegex: true })
        const message = makeMessage()
        expect(strategy.matchesMessage(entry, message)).toBe(false)
    })

    it("returns false if message is undefined", () => {
        const entry = makeEntry()
        const message = makeMessage({ message: undefined })
        expect(strategy.matchesMessage(entry, message)).toBe(false)
    })

    it("tracks failed matches in context", () => {
        const entry = makeEntry({ keys: "wizard" })
        const message = makeMessage()
        const context = { failedMatches: {} }
        expect(strategy.matchesMessage(entry, message, context)).toBe(false)
        expect(context.failedMatches[message.id]).toContain(entry.id)
    })

    it("skips matching if combination already failed", () => {
        const entry = makeEntry({ keys: "wizard" })
        const message = makeMessage()
        const context = { failedMatches: { [message.id]: [entry.id] } }
        expect(strategy.matchesMessage(entry, message, context)).toBe(false)
    })

    it("getName returns 'keyword'", () => {
        expect(strategy.getName()).toBe("keyword")
    })
})

describe("VectorMatchingStrategy", () => {
    let strategy: VectorMatchingStrategy

    beforeEach(async () => {
        strategy = new VectorMatchingStrategy()
        await strategy.initialize()
    })

    it("getName returns 'vector'", () => {
        expect(strategy.getName()).toBe("vector")
    })

    it("throws if not initialized", async () => {
        const uninitStrategy = new VectorMatchingStrategy()
        const entry = makeEntry()
        const message = makeMessage()
        await expect(
            uninitStrategy.matchesMessage(entry, message)
        ).rejects.toThrow("VectorMatchingStrategy must be initialized before use")
    })

    it("returns true for keyword match (fallback)", async () => {
        const entry = makeEntry()
        const message = makeMessage()
        await expect(strategy.matchesMessage(entry, message)).resolves.toBe(true)
    })

    it("returns false for no keyword match (fallback)", async () => {
        const entry = makeEntry({ keys: "wizard" })
        const message = makeMessage()
        await expect(strategy.matchesMessage(entry, message)).resolves.toBe(false)
    })

    it("cleanup resets state", async () => {
        await strategy.cleanup()
        // embeddings should be cleared and isInitialized false
        // @ts-expect-error: test private
        expect(strategy.embeddings.size).toBe(0)
        // @ts-expect-error: test private
        expect(strategy.isInitialized).toBe(false)
    })
})

describe("MatchingStrategyFactory", () => {
    it("creates keyword strategy", async () => {
        const strategy = await MatchingStrategyFactory.createStrategy({
            strategy: "keyword",
        })
        expect(strategy.getName()).toBe("keyword")
    })

    it("creates vector strategy and initializes it", async () => {
        const strategy = await MatchingStrategyFactory.createStrategy({
            strategy: "vector",
        })
        expect(strategy.getName()).toBe("vector")
    })

    it("throws on unknown strategy", async () => {
        await expect(
            MatchingStrategyFactory.createStrategy({ strategy: "unknown" as any })
        ).rejects.toThrow("Unknown matching strategy: unknown")
    })

    it("getAvailableStrategies returns correct list", () => {
        expect(MatchingStrategyFactory.getAvailableStrategies()).toEqual([
            "keyword",
            "vector",
        ])
    })
})