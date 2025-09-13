import { describe, it, expect } from "vitest"
import {
	AnthropicClaudeTokenCounter,
	CohereTokenCounter,
	EstimateTokenCounter,
	GeminiTokenCounter,
	GemmaTokenCounter,
	Llama3TokenCounter,
	LlamaTokenCounter,
	MistralTokenCounter,
	OpenAIGPT2TokenCounter,
	OpenAIGPT35TokenCounter,
	OpenAIGPT4oTokenCounter,
	OpenAIGPT4TokenCounter,
	TokenCounters
} from "$lib/server/utils/TokenCounterManager"

describe("EstimateTokenCounter", () => {
	it("Will count tokens correctly or under estimating them.", () => {
		const result = new EstimateTokenCounter()
		expect(result.countTokens("Hello world")).toBe(4)
	})

	it("Counts tokens in an empty string as zero", () => {
		const result = new EstimateTokenCounter()
		expect(result.countTokens("")).toBe(0)
	})

	it("Counts tokens for a single word", () => {
		const result = new EstimateTokenCounter()
		expect(result.countTokens("token")).toBe(2)
	})

	it("Counts tokens for a sentence with punctuation", () => {
		const result = new EstimateTokenCounter()
		expect(result.countTokens("That's a slightly longer sentence...")).toBe(
			11
		)
	})

	it("Counts tokens for a string with multiple spaces", () => {
		const result = new EstimateTokenCounter()
		expect(result.countTokens("Hello     world")).toBe(5)
	})

	it("Counts tokens for a string with numbers and symbols", () => {
		const result = new EstimateTokenCounter()
		expect(result.countTokens("Some 1234 numbers and @#$% symbols!")).toBe(
			11
		)
	})

	it("Counts tokens for non-ASCII characters", () => {
		const result = new EstimateTokenCounter()
		expect(result.countTokens("こんにちは世界")).toBeTypeOf("number")
	})

	it("Counts tokens for very long string", () => {
		const result = new EstimateTokenCounter()
		const longStr = "a ".repeat(1000)
		expect(result.countTokens(longStr)).toBeGreaterThan(0)
	})
})

describe("OpenAIGPT2TokenCounter", () => {
	it("Will count tokens correctly or under estimating them.", () => {
		const result = new OpenAIGPT2TokenCounter()
		expect(result.countTokens("Hello world")).toBe(2)
	})

	it("Counts tokens in an empty string as zero", () => {
		const result = new OpenAIGPT2TokenCounter()
		expect(result.countTokens("")).toBe(0)
	})

	it("Counts tokens for a single word", () => {
		const result = new OpenAIGPT2TokenCounter()
		expect(result.countTokens("token")).toBe(1)
	})

	it("Counts tokens for a sentence with punctuation", () => {
		const result = new OpenAIGPT2TokenCounter()
		expect(result.countTokens("That's a slightly longer sentence...")).toBe(
			7
		)
	})

	it("Counts tokens for a string with multiple spaces", () => {
		const result = new OpenAIGPT2TokenCounter()
		expect(result.countTokens("Hello     world")).toBe(6)
	})

	it("Counts tokens for a string with numbers and symbols", () => {
		const result = new OpenAIGPT2TokenCounter()
		expect(result.countTokens("Some 1234 numbers and @#$% symbols!")).toBe(
			10
		)
	})

	it("Counts tokens for emoji and unicode", () => {
		const result = new OpenAIGPT2TokenCounter()
		expect(result.countTokens("😀😃😄😁")).toBeTypeOf("number")
	})

	it("Counts tokens for very long string", () => {
		const result = new OpenAIGPT2TokenCounter()
		const longStr = "token ".repeat(1000)
		expect(result.countTokens(longStr)).toBeGreaterThan(0)
	})
})

describe("OpenAIGPT35TokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new OpenAIGPT35TokenCounter()
		expect(counter.countTokens("Hello world")).toBeTypeOf("number")
	})
	it("Counts tokens for empty string", () => {
		const counter = new OpenAIGPT35TokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with special characters", () => {
		const counter = new OpenAIGPT35TokenCounter()
		expect(counter.countTokens("!@#$%^&*()")).toBeTypeOf("number")
	})
})

describe("OpenAIGPT4TokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new OpenAIGPT4TokenCounter()
		expect(counter.countTokens("Hello world")).toBeTypeOf("number")
	})
	it("Counts tokens for empty string", () => {
		const counter = new OpenAIGPT4TokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with newline characters", () => {
		const counter = new OpenAIGPT4TokenCounter()
		expect(counter.countTokens("Hello\nworld")).toBeTypeOf("number")
	})
})

describe("OpenAIGPT4oTokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new OpenAIGPT4oTokenCounter()
		expect(counter.countTokens("Hello world")).toBeTypeOf("number")
	})
	it("Counts tokens for empty string", () => {
		const counter = new OpenAIGPT4oTokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with tabs", () => {
		const counter = new OpenAIGPT4oTokenCounter()
		expect(counter.countTokens("Hello\tworld")).toBeTypeOf("number")
	})
})

describe("LlamaTokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new LlamaTokenCounter()
		expect(counter.countTokens("Hello world")).toBeTypeOf("number")
	})
	it("Counts tokens for empty string", () => {
		const counter = new LlamaTokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with mixed languages", () => {
		const counter = new LlamaTokenCounter()
		expect(counter.countTokens("Hello 世界 token")).toBeTypeOf("number")
	})
})

describe("Llama3TokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new Llama3TokenCounter()
		expect(counter.countTokens("Hello world")).toBeTypeOf("number")
	})
	it("Counts tokens for empty string", () => {
		const counter = new Llama3TokenCounter()
		expect(counter.countTokens('')).toBe(2)
	})
	it("Counts tokens for string with numbers", () => {
		const counter = new Llama3TokenCounter()
		expect(counter.countTokens("1234567890")).toBeTypeOf("number")
	})
})

describe("MistralTokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new MistralTokenCounter()
		expect(counter.countTokens("Hello world")).toBeTypeOf("number")
	})
	it("Counts tokens for empty string", () => {
		const counter = new MistralTokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with repeated words", () => {
		const counter = new MistralTokenCounter()
		const repeated = "word ".repeat(100)
		expect(counter.countTokens(repeated)).toBeTypeOf("number")
	})
})

describe("AnthropicClaudeTokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new AnthropicClaudeTokenCounter()
		expect(counter.countTokens("Hello world")).toBe(
			Math.ceil("Hello world".length / 3.6)
		)
	})
	it("Counts tokens for empty string", () => {
		const counter = new AnthropicClaudeTokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with emoji", () => {
		const counter = new AnthropicClaudeTokenCounter()
		expect(counter.countTokens("😀😃😄😁")).toBeTypeOf("number")
	})
})

describe("CohereTokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new CohereTokenCounter()
		expect(counter.countTokens("Hello world")).toBeTypeOf("number")
	})
	it("Counts tokens for empty string", () => {
		const counter = new CohereTokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with mixed case", () => {
		const counter = new CohereTokenCounter()
		expect(counter.countTokens("Hello WORLD hello World")).toBeTypeOf("number")
	})
})

describe("GeminiTokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new GeminiTokenCounter()
		expect(counter.countTokens("Hello world")).toBe(
			Math.ceil("Hello world".length / 4)
		)
	})
	it("Counts tokens for empty string", () => {
		const counter = new GeminiTokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with symbols and numbers", () => {
		const counter = new GeminiTokenCounter()
		expect(counter.countTokens("abc123!@#")).toBeTypeOf("number")
	})
})

describe("GemmaTokenCounter", () => {
	it("Counts tokens for a simple string", () => {
		const counter = new GemmaTokenCounter()
		expect(counter.countTokens("Hello world")).toBe(
			Math.ceil("Hello world".length / 3.5)
		)
	})
	it("Counts tokens for empty string", () => {
		const counter = new GemmaTokenCounter()
		expect(counter.countTokens("")).toBe(0)
	})
	it("Counts tokens for string with whitespace", () => {
		const counter = new GemmaTokenCounter()
		expect(counter.countTokens("   Hello   world   ")).toBeTypeOf("number")
	})
})

describe("TokenCounters", () => {
	it("Throws error for unknown strategy", () => {
		expect(() => new TokenCounters("unknown")).toThrow()
	})

	it("Returns available strategies", () => {
		const strategies = TokenCounters.availableStrategies()
		expect(strategies).toBeTypeOf("object")
		expect(Object.keys(strategies).length).toBeGreaterThan(0)
	})

	it("Counts tokens using default strategy", () => {
		const tc = new TokenCounters()
		expect(tc.countTokens("Hello world")).toBeTypeOf("number")
	})

	it("Counts tokens using a specific strategy", () => {
		const tc = new TokenCounters("openai-gpt2")
		expect(tc.countTokens("Hello world")).toBeTypeOf("number")
	})

	it("Counts tokens for empty string with all strategies", () => {
		const strategies = TokenCounters.availableStrategies()
		for (const key of Object.keys(strategies)) {
			const tc = new TokenCounters(key)
			expect(tc.countTokens("")).toBeTypeOf("number")
		}
	})

	it("Counts tokens for long string with all strategies", () => {
		const strategies = TokenCounters.availableStrategies()
		const longStr = "token ".repeat(100)
		for (const key of Object.keys(strategies)) {
			const tc = new TokenCounters(key)
			expect(tc.countTokens(longStr)).toBeTypeOf("number")
		}
	})
})
