import { FormatNames } from "$lib/shared/constants/FormatNames";

export class StopStrings {
    static get(format: typeof FormatNames.OPTION): string[] {
        switch (format) {
            case FormatNames.ChatML:
                // <|im_end|> is the explicit stop string for ChatML, plus block starters and template markers
                return [
                    "<|im_end|>",
                    "<|im_start|>",
                    "user:",
                    "char:",
                    "assistant:",
                    "{{user}}:",
                    "{{char}}:"
                ];
            case FormatNames.Basic:
                // Block starters for Basic, plus template markers
                return [
                    "*** user",
                    "*** char",
                    "*** assistant",
                    "*** system",
                    "{{user}}:",
                    "{{char}}:"
                ];
            case FormatNames.Vicuna:
                // Block starters for Vicuna, plus </s> and template markers
                return [
                    "</s>",
                    "### User:",
                    "### Char:",
                    "### Assistant:",
                    "### System:",
                    "{{user}}:",
                    "{{char}}:"
                ];
            case FormatNames.OpenAI:
                // Block starters for OpenAI, plus template markers
                return [
                    "<|user|>",
                    "<|char|>",
                    "<|assistant|>",
                    "<|system|>",
                    "{{user}}:",
                    "{{char}}:"
                ];
            default:
                return ["<|im_end|>"];
        }
    }
}