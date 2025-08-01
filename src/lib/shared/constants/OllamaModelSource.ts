export class OllamaModelSearchSource {
	static RECOMMENDED = "recommended"
	static OLLAMA_DB = "ollamadb"
	static HUGGING_FACE = "huggingface"

	static options = [
		{ value: OllamaModelSearchSource.RECOMMENDED, label: "Recommended" },
		{ value: OllamaModelSearchSource.HUGGING_FACE, label: "Hugging Face" },
		{ value: OllamaModelSearchSource.OLLAMA_DB, label: "ollamadb.dev" }
	]
}
