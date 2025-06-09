export class PromptFormats {
    static readonly VICUNA = "vicuna";
    static readonly CHATML = "chatml";
    static readonly BASIC = "basic";
    static readonly OPENAI = "openai";

    static readonly keys = [
        PromptFormats.VICUNA,
        PromptFormats.CHATML,
        PromptFormats.BASIC,
        PromptFormats.OPENAI
    ];

    static readonly options = [
        { value: PromptFormats.VICUNA, label: "Vicuna (Simple)" },
        { value: PromptFormats.CHATML, label: "ChatML" },
        { value: PromptFormats.BASIC, label: "Basic / Legacy" },
        { value: PromptFormats.OPENAI, label: "OpenAI" }
    ];
}