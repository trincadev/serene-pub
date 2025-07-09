<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import * as skio from "sveltekit-io"
	import { onMount, onDestroy } from "svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import { OllamaModelSearchSource } from "$lib/shared/constants/OllamaModelSource"
	import HuggingFaceQuantizationModal from "$lib/client/components/modals/HuggingFaceQuantizationModal.svelte"
	import OllamaDownloadProgressModal from "$lib/client/components/modals/OllamaDownloadProgressModal.svelte"

	interface OllamaModel {
		name: string
		size: number
		digest: string
		modified_at: string
		details?: {
			parameter_size: string
			quantization_level: string
		}
	}

	const socket = skio.get()

	let searchString = $state("")
	let downloadingModels = $state(new Set<string>())
	let installedModels: Sockets.OllamaModelsList.Response["models"] = $state(
		[]
	)
	let selectedSource = $state(OllamaModelSearchSource.HUGGING_FACE)
	let availableModels: Sockets.OllamaSearchAvailableModels.Response["models"] =
		$state([])
	let isSearching = $state(false)
	let showHuggingFaceModal = $state(false)
	let selectedModelForDownload: string | null = $state(null)
	let huggingFaceSiblings: Sockets.OllamaHuggingFaceSiblingsList.Response["siblings"] =
		$state([])
	let isLoadingSiblings = $state(false)

	let downloadingQuants: {
		[key: string]: {
			modelName: string
			status: string
			files: { [key: string]: { total: number; completed: number } }
		}
	} = $state({})

	// Track which models are being downloaded to handle completion
	let currentlyDownloading = $state(new Set<string>())

	let isAnyDownloadInProgress = $derived(
		!!Object.keys(downloadingQuants).length
	)

	function isModelInstalled(modelName: string): boolean {
		return installedModels.some((model) => model.name.startsWith(modelName))
	}

	$effect(() => {
		console.log("downloadingQuantizations:", downloadingQuants)
		console.log("isAnyDownloadInProgress:", isAnyDownloadInProgress)
	})

	async function downloadModel(modelName: string) {
		try {
			downloadingModels.add(modelName)

			// Simulate download delay
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// Add to installed models
			const newModel: OllamaModel = {
				name: `${modelName}:latest`,
				size: Math.floor(Math.random() * 5000000000) + 1000000000, // Random size 1-5GB
				digest: `sha256:${Math.random().toString(36).substring(2, 15)}`,
				modified_at: new Date().toISOString(),
				details: {
					parameter_size: "7B",
					quantization_level: "Q4_0"
				}
			}

			installedModels = [...installedModels, newModel]
			toaster.success({ title: `${modelName} downloaded successfully` })
		} catch (error) {
			console.error("Download failed:", error)
			toaster.error({ title: `Failed to download ${modelName}` })
		} finally {
			downloadingModels.delete(modelName)
		}
	}

	function searchAvailableModels() {
		isSearching = true
		socket.emit("ollamaSearchAvailableModels", {
			search: searchString.trim(),
			source: selectedSource
		} as Sockets.OllamaSearchAvailableModels.Call)
	}

	function openHuggingFaceModal(modelId: string) {
		selectedModelForDownload = modelId
		showHuggingFaceModal = true
		isLoadingSiblings = true
		huggingFaceSiblings = []

		socket.emit("ollamaHuggingFaceSiblingsList", {
			modelId: modelId
		} as Sockets.OllamaHuggingFaceSiblingsList.Call)
	}

	function closeHuggingFaceModal() {
		showHuggingFaceModal = false
		selectedModelForDownload = null
		huggingFaceSiblings = []
		isLoadingSiblings = false
	}

	function downloadHuggingFaceQuantization(
		modelId: string,
		rfilename: string
	) {
		const huggingFaceUrl = `hf.co/${modelId}:${rfilename}`

		// Track this model as currently downloading
		currentlyDownloading.add(huggingFaceUrl)

		// Emit the pull request to Ollama
		socket.emit("ollamaPullModel", {
			modelName: huggingFaceUrl
		} as Sockets.OllamaPullModel.Call)
	}

	function cancelModelDownload(modelName: string) {
		// Remove from downloading quants locally
		delete downloadingQuants[modelName]
		// Remove from currently downloading set
		currentlyDownloading.delete(modelName)
		
		// Emit cancel request to server
		socket.emit("ollamaCancelPull", {
			modelName: modelName
		} as Sockets.OllamaCancelPull.Call)
	}

	function clearDoneDownloads() {
		// Remove downloads that are done (canceled, success, error, or complete)
		for (const [key, progress] of Object.entries(downloadingQuants)) {
			const status = progress.status.toLowerCase()
			const isComplete = Object.values(progress.files).length > 0 && 
				Object.values(progress.files).every(file => file.total > 0 && file.completed >= file.total)
			
			if (status === "canceled" || status === "success" || status === "error" || isComplete) {
				delete downloadingQuants[key]
			}
		}
	}

	$effect(() => {
		const _search = searchString.trim()
		const _source = selectedSource
		const timeoutId = setTimeout(() => {
			searchAvailableModels()
		}, 500) // 500ms delay

		return () => clearTimeout(timeoutId)
	})

	async function refreshInstalled() {
		socket.emit("ollamaModelsList", {})
	}

	onMount(() => {
		// Socket event listeners
		socket.on(
			"ollamaModelsList",
			(message: Sockets.OllamaModelsList.Response) => {
				installedModels = message.models
			}
		)

		socket.on(
			"ollamaSearchAvailableModels",
			(message: Sockets.OllamaSearchAvailableModels.Response) => {
				isSearching = false
				if (message.error) {
					toaster.error({ title: message.error })
					availableModels = []
				} else {
					availableModels = message.models || []
				}
			}
		)

		socket.on(
			"ollamaPullModel",
			(message: Sockets.OllamaPullModel.Response) => {
				// Handle model pull completion/error only - no progress handling
				console.log("Pull model response:", message)
				if (message.success) {
					// Mark the most recent download as successful
					for (const modelName of currentlyDownloading) {
						if (downloadingQuants[modelName]) {
							downloadingQuants[modelName].status = "success"
							currentlyDownloading.delete(modelName)
							break
						}
					}
					socket.emit("ollamaModelsList", {})
					toaster.success({ title: "Model downloaded successfully" })
					closeHuggingFaceModal()
				} else if (message.error) {
					// Mark the most recent download as error
					for (const modelName of currentlyDownloading) {
						if (downloadingQuants[modelName]) {
							downloadingQuants[modelName].status = "error"
							currentlyDownloading.delete(modelName)
							break
						}
					}
					toaster.error({ title: message.error })
				}
			}
		)

		socket.on(
			"ollamaPullProgress",
			(message: Sockets.OllamaPullProgress.Response) => {
				closeHuggingFaceModal()
				// console.log("Pull progress update:", message)
				// Update progress for the downloading quantization
				const modelName = message.modelName

				console.log("Pull progress:", message)

				let file: string | undefined
				if (message.status.toLowerCase() !== "pulling manifest" && message.status.includes("pulling ")) {
					file = message.status.split("pulling ")[1]
				}

				if (!downloadingQuants[modelName]) {
					downloadingQuants[modelName] = {
						modelName: modelName,
						status: message.status,
						files: {}
					}
				}

				if (file) {
					downloadingQuants[modelName].files[file] = {
						total: message.total || 0,
						completed: message.completed || 0
					}
				}

				downloadingQuants[modelName].status = message.status
			}
		)

		socket.on(
			"ollamaHuggingFaceSiblingsList",
			(message: Sockets.OllamaHuggingFaceSiblingsList.Response) => {
				isLoadingSiblings = false
				if (message.error) {
					toaster.error({ title: message.error })
					huggingFaceSiblings = []
				} else {
					huggingFaceSiblings = message.siblings || []
				}
			}
		)

		socket.on(
			"ollamaCancelPull",
			(message: Sockets.OllamaCancelPull.Response) => {
				if (message.success && message.modelName) {
					// Remove from downloading quants
					delete downloadingQuants[message.modelName]
				} else if (message.error) {
					toaster.error({ title: message.error })
				}
			}
		)

		// Load initial installed models
		refreshInstalled()
	})

	onDestroy(() => {
		socket.off("ollamaModelsList")
		socket.off("ollamaSearchAvailableModels")
		socket.off("ollamaPullModel")
		socket.off("ollamaPullProgress")
		socket.off("ollamaHuggingFaceSiblingsList")
		socket.off("ollamaCancelPull")
	})
</script>

<!-- Search for available models -->
<div class="px-4 py-2">
	<div class="flex gap-2">
		<div class="relative flex-1">
			<Icons.Search
				class="text-surface-500 absolute top-1/2 left-3 -translate-y-1/2 transform"
				size={16}
			/>
			<input
				type="text"
				placeholder="Search available models..."
				class="input w-full pl-10"
				aria-label="Model search"
				bind:value={searchString}
			/>
		</div>
		<select
			id="source"
			name="source"
			aria-label="Model search source"
			class="select bg-background border-muted w-fit rounded border"
			bind:value={selectedSource}
		>
			{#each OllamaModelSearchSource.options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>
</div>

<div class="space-y-3 p-4">
	{#if isSearching}
		<div class="p-6 text-center">
			<Icons.Loader2 class="mx-auto mb-4 animate-spin" size={32} />
			<p class="text-sm opacity-75">Searching for models...</p>
		</div>
	{:else if availableModels.length === 0}
		<div class="p-6 text-center">
			<Icons.Search class="text-surface-500 mx-auto mb-4" size={48} />
			<h3 class="h4 mb-2">No models found</h3>
			<p class="mb-4 text-sm opacity-75">
				No available models match your search for "{searchString}".
			</p>
		</div>
	{:else}
		{#each availableModels as model}
			<div class="card preset-tonal p-4">
				<div class="flex flex-col gap-2">
					<!-- Header with name and badges -->
					<div class="flex items-start justify-between">
						<div class="flex flex-wrap items-center gap-2">
							<h4 class="text-lg font-semibold">
								{model.name}
							</h4>
						</div>
					</div>

					<div>
						{#if model.popular}
							<span
								class="badge bg-primary-500 rounded-full px-2 py-1 text-xs text-white"
							>
								<Icons.TrendingUp
									size={12}
									class="mr-1 inline"
								/>
								Popular
							</span>
						{/if}
						{#if model.trendingScore && model.trendingScore > 0.7}
							<span
								class="badge rounded-full bg-orange-500 px-2 py-1 text-xs text-white"
							>
								<Icons.Flame size={12} class="mr-1 inline" />
								Trending
							</span>
						{/if}
					</div>

					<!-- Description -->
					<p class="text-surface-500 mb-3 line-clamp-2 text-sm">
						{model.description || "No description available"}
					</p>

					<!-- Tags -->
					{#if model.tags && model.tags.length > 0}
						<div class="mb-3 flex flex-wrap gap-1">
							{#each model.tags.slice(0, 4) as tag}
								<span
									class="badge bg-surface-200-800 text-surface-700-300 rounded px-2 py-1 text-xs"
								>
									{tag}
								</span>
							{/each}
							{#if model.tags.length > 4}
								<span class="text-surface-500 text-xs">
									+{model.tags.length - 4} more
								</span>
							{/if}
						</div>
					{/if}

					<!-- Metadata row -->
					<div
						class="text-surface-500 flex flex-wrap items-center gap-4 text-xs"
					>
						{#if model.size}
							<div class="flex items-center gap-1">
								<Icons.HardDrive size={12} />
								<span>{model.size}</span>
							</div>
						{/if}
						{#if model.downloads}
							<div class="flex items-center gap-1">
								<Icons.Download size={12} />
								<span>
									{model.downloads.toLocaleString()} downloads
								</span>
							</div>
						{/if}
						{#if model.likes}
							<div class="flex items-center gap-1">
								<Icons.Heart size={12} />
								<span>
									{model.likes.toLocaleString()} likes
								</span>
							</div>
						{/if}
						{#if model.updatedAtStr}
							<div class="flex items-center gap-1">
								<Icons.Clock size={12} />
								<span>Updated {model.updatedAtStr}</span>
							</div>
						{/if}
					</div>
					<div class="flex min-w-[100px] gap-2">
						<button
							class="btn btn-sm {isModelInstalled(model.name)
								? 'preset-filled-success-500'
								: 'preset-filled-primary-500'}"
							onclick={() => {
								if (
									selectedSource ===
									OllamaModelSearchSource.HUGGING_FACE
								) {
									openHuggingFaceModal(model.name)
								} else {
									downloadModel(model.name)
								}
							}}
							disabled={downloadingModels.has(model.name) ||
								isModelInstalled(model.name)}
						>
							{#if downloadingModels.has(model.name)}
								<Icons.Loader2 size={14} class="animate-spin" />
								Installing...
							{:else if isModelInstalled(model.name)}
								<Icons.Check size={14} />
								Installed
							{:else}
								<Icons.Download size={14} />
								Install
							{/if}
						</button>
						{#if model.url}
							<a
								href={model.url}
								target="_blank"
								rel="noopener noreferrer"
								class="btn btn-sm preset-filled-secondary-500 text-center"
							>
								<Icons.ExternalLink size={14} />
								View
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Hugging Face Download Modal -->
<HuggingFaceQuantizationModal
	bind:open={showHuggingFaceModal}
	{selectedModelForDownload}
	{huggingFaceSiblings}
	{isLoadingSiblings}
	onClose={closeHuggingFaceModal}
	onDownload={downloadHuggingFaceQuantization}
/>

<!-- Download Progress Modal -->
<OllamaDownloadProgressModal
	open={isAnyDownloadInProgress}
	downloadingQuants={downloadingQuants}
	onCancel={cancelModelDownload}
	onClose={clearDoneDownloads}
/>
