import ollamaAdapter from "../connectionAdapters/OllamaAdapter"
import openAIAdapter from "../connectionAdapters/OpenAIAdapter"
import lmStudioAdapter from "../connectionAdapters/LMStudioAdapter"
import type { AdapterExports } from "../connectionAdapters/BaseConnectionAdapter"

export function getConnectionAdapter(connectionType: string): AdapterExports {
	switch (connectionType) {
		case "lmstudio":
			return lmStudioAdapter
		case "ollama":
			return ollamaAdapter
		case "openai":
			return openAIAdapter
		// Add more cases for other connection types as needed
		default:
			throw new Error(`Unsupported connection type: ${connectionType}`)
	}
}
