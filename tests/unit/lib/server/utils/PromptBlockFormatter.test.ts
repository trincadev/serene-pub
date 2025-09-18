import { describe, it, expect } from "vitest"
import { PromptBlockFormatter } from "$lib/server/utils/PromptBlockFormatter"
import { PromptFormats } from "$lib/shared/constants/PromptFormats"

describe("PromptBlockFormatter", () => {
	it("chatmlOpen returns correct string", () => {
		expect(PromptBlockFormatter.chatmlOpen("user")).toBe("<|im_start|>user\n")
		expect(PromptBlockFormatter.chatmlOpen("assistant")).toBe("<|im_start|>assistant\n")
	})

	it("basicOpen returns correct string", () => {
		expect(PromptBlockFormatter.basicOpen("user")).toBe("*** user\n")
		expect(PromptBlockFormatter.basicOpen("system")).toBe("*** system\n")
	})

	it("vicunaOpen returns correct string", () => {
		expect(PromptBlockFormatter.vicunaOpen("user")).toBe("### User:\n")
		expect(PromptBlockFormatter.vicunaOpen("assistant")).toBe("### Assistant:\n")
	})

	it("openaiOpen returns correct string", () => {
		expect(PromptBlockFormatter.openaiOpen("user")).toBe("<|user|>\n")
		expect(PromptBlockFormatter.openaiOpen("system")).toBe("<|system|>\n")
	})

	it("llama2InstOpen returns correct string for system/user/assistant", () => {
		expect(PromptBlockFormatter.llama2InstOpen("system")).toBe("<s>[INST] <<SYS>>\n")
		expect(PromptBlockFormatter.llama2InstOpen("user")).toBe("<s>\n")
		expect(PromptBlockFormatter.llama2InstOpen("assistant")).toBe("<s>\n")
		expect(PromptBlockFormatter.llama2InstOpen("tool")).toBe("<s>[INST] ")
	})

	it("llama2InstClose returns correct string for system/user/assistant", () => {
		expect(PromptBlockFormatter.llama2InstClose("system")).toBe("\n<</SYS>> [/INST]></s>\n")
		expect(PromptBlockFormatter.llama2InstClose("user")).toBe("\n</s>\n")
		expect(PromptBlockFormatter.llama2InstClose("assistant")).toBe("\n</s>\n")
		expect(PromptBlockFormatter.llama2InstClose("tool")).toBe(" [/INST]></s>\n")
	})

	it("claudeOpen returns correct string", () => {
		expect(PromptBlockFormatter.claudeOpen("user")).toBe("Human: ")
		expect(PromptBlockFormatter.claudeOpen("assistant")).toBe("\nAssistant: ")
	})

	it("instructOpen returns correct string", () => {
		expect(PromptBlockFormatter.instructOpen()).toBe("### Instruction:\n")
	})

	it("tekkenBlock formats correctly with system", () => {
		const result = PromptBlockFormatter.tekkenBlock({
			system: "sys",
			user: "usr",
			assistant: "asst"
		})
		expect(result).toBe("<s>[INST] <<SYS>>\nsys\n<</SYS>>\n\nusr [/INST]\nasst</s>\n")
	})

	it("tekkenBlock formats correctly without system", () => {
		const result = PromptBlockFormatter.tekkenBlock({
			user: "usr",
			assistant: "asst"
		})
		expect(result).toBe("<s>[INST] usr [/INST]\nasst</s>\n")
	})

	it("makeBlock returns correct format for CHATML", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.CHATML,
			role: "user",
			content: "hello"
		})
		expect(block).toBe("<|im_start|>user\nhello<|im_end|>\n")
	})

	it("makeBlock returns correct format for BASIC", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.BASIC,
			role: "assistant",
			content: "hi"
		})
		expect(block).toBe("*** assistant\nhi\n\n")
	})

	it("makeBlock returns correct format for VICUNA", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.VICUNA,
			role: "system",
			content: "sys"
		})
		expect(block).toBe("### System:\nsys\n")
	})

	it("makeBlock returns correct format for OPENAI", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.OPENAI,
			role: "user",
			content: "openai"
		})
		expect(block).toBe("<|user|>\nopenai\n")
	})

	it("makeBlock returns correct format for LLAMA2_INST", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.LLAMA2_INST,
			role: "system",
			content: "sys"
		})
		expect(block).toBe("<s>[INST] <<SYS>>\nsys\n<</SYS>> [/INST]></s>\n")
	})

	it("makeBlock returns correct format for CLAUDE", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.CLAUDE,
			role: "user",
			content: "hi"
		})
		expect(block).toBe("Human: hi\n")
	})

	it("makeBlock returns correct format for INSTRUCT", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.INSTRUCT,
			role: "user",
			content: "do this"
		})
		expect(block).toBe("### Instruction:\ndo this\n### Response:\n")
	})

	it("makeBlock returns correct format for SPLIT_CHAT", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.SPLIT_CHAT,
			role: "assistant",
			content: "split"
		})
		expect(block).toBe("<@role:assistant>\nsplit\n")
	})

	it("makeBlock uses default CHATML for unknown format", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: "unknown",
			role: "user",
			content: "default"
		})
		expect(block).toBe("<|im_start|>user\ndefault<|im_end|>\n")
	})

	it("makeBlock respects includeClose=false", () => {
		const block = PromptBlockFormatter.makeBlock({
			format: PromptFormats.BASIC,
			role: "user",
			content: "no close",
			includeClose: false
		})
		expect(block).toBe("*** user\nno close")
	})
})