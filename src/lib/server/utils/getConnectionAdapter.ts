import { OllamaAdapter } from "../connectionAdapters/OllamaAdapter"
import { OpenAIAdapter } from "../connectionAdapters/OpenAIAdapter"
import { LMStudioAdapter } from "../connectionAdapters/LMStudioAdapter"

export function getConnectionAdapter(connectionType: string) {
	switch (connectionType) {
		case "lmstudio":
			return LMStudioAdapter
		case "ollama":
			return OllamaAdapter
		case "openai":
			return OpenAIAdapter
		// Add more cases for other connection types as needed
		default:
			throw new Error(`Unsupported connection type: ${connectionType}`)
	}
}
