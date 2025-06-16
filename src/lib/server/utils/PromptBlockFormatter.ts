import { PromptFormats } from "$lib/shared/constants/PromptFormats"
import _ from "lodash"

export class PromptBlockFormatter {
	static readonly CHATML_OPEN = "<|im_start|>"
	static readonly CHATML_CLOSE = "<|im_end|>\n"
	static readonly BASIC_OPEN = "*** "
	static readonly BASIC_CLOSE = "\n\n"
	static readonly VICUNA_OPEN = "### "
	static readonly VICUNA_CLOSE = "\n"
	static readonly OPENAI_OPEN = "<|"
	static readonly OPENAI_CLOSE = "\n"
	static readonly LLAMA2_INST_OPEN = "[INST] "
	static readonly LLAMA2_INST_CLOSE = " [/INST]\n"
	static readonly CLAUDE_OPEN = "Human: "
	static readonly CLAUDE_CLOSE = "\nAssistant: "
	static readonly INSTRUCT_OPEN = "### Instruction:\n"
	static readonly INSTRUCT_CLOSE = "\n### Response:\n"

	static chatmlOpen(role: string) {
		return `${PromptBlockFormatter.CHATML_OPEN}${role}\n`
	}
	static chatmlClose = PromptBlockFormatter.CHATML_CLOSE
	static basicOpen(role: string) {
		return `${PromptBlockFormatter.BASIC_OPEN}${role}\n`
	}
	static basicClose = PromptBlockFormatter.BASIC_CLOSE
	static vicunaOpen(role: string) {
		return `${PromptBlockFormatter.VICUNA_OPEN}${_.capitalize(role)}:\n`
	}
	static vicunaClose = PromptBlockFormatter.VICUNA_CLOSE
	static openaiOpen(role: string) {
		return `${PromptBlockFormatter.OPENAI_OPEN}${role}|>\n`
	}
	static openaiClose = PromptBlockFormatter.OPENAI_CLOSE
	static llama2InstOpen(role: string) {
		return PromptBlockFormatter.LLAMA2_INST_OPEN
	}
	static llama2InstClose = PromptBlockFormatter.LLAMA2_INST_CLOSE
	static claudeOpen(role: string) {
		return role === "user"
			? PromptBlockFormatter.CLAUDE_OPEN
			: PromptBlockFormatter.CLAUDE_CLOSE
	}
	static claudeClose = "\n"
	static instructOpen() {
		return PromptBlockFormatter.INSTRUCT_OPEN
	}
	static instructClose = PromptBlockFormatter.INSTRUCT_CLOSE

	static makeBlock({
		format,
		role,
		content,
		includeClose = true
	}: {
		format: string
		role: string
		content: string
		includeClose?: boolean
	}) {
		switch (format) {
			case PromptFormats.CHATML:
				return (
					this.chatmlOpen(role) +
					content +
					(includeClose ? this.chatmlClose : "")
				)
			case PromptFormats.BASIC:
				return (
					this.basicOpen(role) +
					content +
					(includeClose ? this.basicClose : "")
				)
			case PromptFormats.VICUNA:
				return (
					this.vicunaOpen(role) +
					content +
					(includeClose ? this.vicunaClose : "")
				)
			case PromptFormats.OPENAI:
				return (
					this.openaiOpen(role) +
					content +
					(includeClose ? this.openaiClose : "")
				)
			case PromptFormats.LLAMA2_INST:
				return (
					this.llama2InstOpen(role) +
					content +
					(includeClose ? this.llama2InstClose : "")
				)
			case PromptFormats.CLAUDE:
				return (
					this.claudeOpen(role) +
					content +
					(includeClose ? this.claudeClose : "")
				)
			case PromptFormats.INSTRUCT:
				return (
					this.instructOpen() +
					content +
					(includeClose ? this.instructClose : "")
				)
			default:
				return (
					this.chatmlOpen(role) +
					content +
					(includeClose ? this.chatmlClose : "")
				)
		}
	}
}
