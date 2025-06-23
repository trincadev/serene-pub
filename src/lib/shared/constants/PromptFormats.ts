export class PromptFormats {
	static readonly VICUNA = "vicuna"
	static readonly CHATML = "chatml"
	static readonly BASIC = "basic"
	static readonly OPENAI = "openai"
	static readonly LLAMA2_INST = "llama2_inst"
	static readonly CLAUDE = "claude"
	static readonly INSTRUCT = "instruct"

	static readonly keys = [
		PromptFormats.VICUNA,
		PromptFormats.CHATML,
		PromptFormats.BASIC,
		PromptFormats.OPENAI,
		PromptFormats.LLAMA2_INST,
		PromptFormats.CLAUDE,
		PromptFormats.INSTRUCT
	]

	static readonly options = [
		{ value: PromptFormats.VICUNA, label: "Vicuna (Default)" },
		{ value: PromptFormats.CHATML, label: "ChatML" },
		{ value: PromptFormats.BASIC, label: "Basic / Legacy" },
		{ value: PromptFormats.OPENAI, label: "OpenAI" },
		{ value: PromptFormats.LLAMA2_INST, label: "LLaMA2/Mistral Instruct" },
		{ value: PromptFormats.CLAUDE, label: "Claude (Human/Assistant)" },
		{
			value: PromptFormats.INSTRUCT,
			label: "Instruct (Alpaca)"
		}
	]
}
