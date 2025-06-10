import { PromptFormats } from "$lib/shared/constants/PromptFormats";

export class StopStrings {
    static get(format: typeof PromptFormats.keys[0]): string[] {
        switch (format) {
            case PromptFormats.CHATML:
                // <|im_end|> is the explicit stop string for ChatML, plus block starters and template markers
                return [
                    "<|im_end|>",
                    "<|im_start|>",
                    "[{{user}}]:",
                    "[{{char}}]:",
                    "[system]:",
                    "[System]:",
                    "[user]:",
                    "[User]:",
                    "[assistant]:",
                    "[Assistant]:"
                ];
            case PromptFormats.BASIC:
                // Block starters for Basic, plus template markers
                return [
                    "*** user",
                    "*** char",
                    "*** assistant",
                    "*** system",
                    "[{{user}}]:",
                    "[{{char}}]:",
                    "[system]:",
                    "[System]:",
                    "[user]:",
                    "[User]:",
                    "[assistant]:",
                    "[Assistant]:"
                ];
            case PromptFormats.VICUNA:
                // Block starters for Vicuna, plus </s> and template markers
                return [
                    "</s>",
                    "### User:",
                    "### Char:",
                    "### Assistant:",
                    "### System:",
                    "[{{user}}]:",
                    "[{{char}}]:",
                    "[system]:",
                    "[System]:",
                    "[user]:",
                    "[User]:",
                    "[assistant]:",
                    "[Assistant]:"
                ];
            case PromptFormats.OPENAI:
                // Block starters for OpenAI, plus template markers
                return [
                    "<|user|>",
                    "<|char|>",
                    "<|assistant|>",
                    "<|system|>",
                    "[{{user}}]:",
                    "[{{char}}]:",
                    "[system]:",
                    "[System]:",
                    "[user]:",
                    "[User]:",
                    "[assistant]:",
                    "[Assistant]:"
                ];
            default:
                return ["<|im_end|>"];
        }
    }
}