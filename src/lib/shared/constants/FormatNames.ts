export class FormatNames {
    static ChatML = "chatml"
    static Basic = "basic"
    static Vicuna = "vicuna"
    static OpenAI = "openai"

    static OPTION: typeof FormatNames.ChatML | 
    typeof FormatNames.Basic | 
    typeof FormatNames.Vicuna | 
    typeof FormatNames.OpenAI

    static options = {
        "Vicuna (Simple)": FormatNames.Vicuna,
        "ChatML": FormatNames.ChatML,
        "Basic / Legacy": FormatNames.Basic,
        "OpenAI": FormatNames.OpenAI
    }
}