import { describe, it, expect } from "vitest"
import { StopStrings } from "$lib/server/utils/StopStrings"
import { PromptFormats } from "$lib/shared/constants/PromptFormats"

const mockCharacters = [
	{ id: 1, name: "Alice", nickname: "Ali" },
	{ id: 2, name: "Bob", nickname: "Bobby" }
]
const mockPersonas = [
	{ name: "Persona1" },
	{ name: "Persona2" }
]

describe("StopStrings.get", () => {
	it("returns correct stop strings for CHATML format", () => {
		const result = StopStrings.get({
			format: PromptFormats.CHATML,
			characters: mockCharacters,
			personas: mockPersonas,
			currentCharacterId: 1
		})
		expect(result).toContain("<|im_end|>")
		expect(result).toContain("system:")
		expect(result).toContain("Bob:")
		expect(result).toContain("Bobby:")
		expect(result).toContain("Persona1:")
		expect(result).toContain("Persona2:")
		expect(result).not.toContain("Alice:")
		expect(result).not.toContain("Ali:")
	})

	it("returns correct stop strings for BASIC format", () => {
		const result = StopStrings.get({
			format: PromptFormats.BASIC,
			characters: mockCharacters,
			personas: mockPersonas,
			currentCharacterId: 2
		})
		expect(result).toContain("system:")
		expect(result).toContain("Alice:")
		expect(result).toContain("Ali:")
		expect(result).toContain("Persona1:")
		expect(result).toContain("Persona2:")
		expect(result).not.toContain("Bob:")
		expect(result).not.toContain("Bobby:")
	})

	it("returns correct stop strings for VICUNA format", () => {
		const result = StopStrings.get({
			format: PromptFormats.VICUNA,
			characters: [],
			personas: [],
			currentCharacterId: 1
		})
		expect(result).toContain("</s>")
		expect(result).toContain("system:")
		expect(result).toContain("assistant:")
	})

	it("returns correct stop strings for OPENAI format", () => {
		const result = StopStrings.get({
			format: PromptFormats.OPENAI,
			characters: [],
			personas: [],
			currentCharacterId: 1
		})
		expect(result).toContain("system:")
		expect(result).toContain("assistant:")
	})

	it("returns correct stop strings for LLAMA2_INST format", () => {
		const result = StopStrings.get({
			format: PromptFormats.LLAMA2_INST,
			characters: [],
			personas: [],
			currentCharacterId: 1
		})
		expect(result).toContain("</s>")
		expect(result).toContain("User:")
		expect(result).toContain("Assistant:")
		expect(result).toContain("System:")
	})

	it("returns default stop strings for unknown format", () => {
		const result = StopStrings.get({
			// @ts-expect-error: testing unknown format
			format: "UNKNOWN",
			characters: [],
			personas: [],
			currentCharacterId: 1
		})
		expect(result).toContain("system:")
		expect(result).toContain("assistant:")
	})

	it("does not add current character's name or nickname to stop strings", () => {
		const result = StopStrings.get({
			format: PromptFormats.BASIC,
			characters: [
				{ id: 1, name: "Alice", nickname: "Ali" },
				{ id: 2, name: "Bob", nickname: "Bobby" }
			],
			personas: [],
			currentCharacterId: 1
		})
		expect(result).not.toContain("Alice:")
		expect(result).not.toContain("Ali:")
		expect(result).toContain("Bob:")
		expect(result).toContain("Bobby:")
	})

	it("handles empty characters and personas arrays", () => {
		const result = StopStrings.get({
			format: PromptFormats.BASIC,
			characters: [],
			personas: [],
			currentCharacterId: 1
		})
		expect(result).toEqual([
			"system:",
			"System:",
			"user:",
			"User:",
			"assistant:",
			"Assistant:"
		])
	})
})