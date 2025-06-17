export class CONNECTION_TYPE {
    static LLAMACPP_COMPLETION = "llamacpp_completion"
    static LM_STUDIO = "lmstudio"
    static OLLAMA = "ollama"
    static OPENAI_CHAT = "openai"

    static options = [
        { value: CONNECTION_TYPE.LLAMACPP_COMPLETION, label: "Llama.cpp" },
        { value: CONNECTION_TYPE.LM_STUDIO, label: "LM Studio" },
        { value: CONNECTION_TYPE.OLLAMA, label: "Ollama" },
        { value: CONNECTION_TYPE.OPENAI_CHAT, label: "OpenAI Chat" }
    ]
}

export const CONNECTION_TYPES = CONNECTION_TYPE.options