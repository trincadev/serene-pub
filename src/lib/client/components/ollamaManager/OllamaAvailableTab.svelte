<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import * as skio from "sveltekit-io"
	import { onMount, onDestroy } from "svelte"
	import { Modal } from "@skeletonlabs/skeleton-svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import { OllamaModelSearchSource } from "$lib/shared/constants/OllamaModelSource"

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

	// State
	let searchString = $state("")
	let downloadingModels = $state(new Set<string>())
	let installedModels: Sockets.OllamaModelsList.Response["models"] = $state(
		[]
	)
	let selectedSource = $state(OllamaModelSearchSource.HUGGING_FACE)
	let availableModels: Sockets.OllamaSearchAvailableModels.Response["models"] =
		$state([])
	let isSearching = $state(false)
	
	// Hugging Face modal state
	let showHuggingFaceModal = $state(false)
	let selectedModelForDownload: string | null = $state(null)
	let huggingFaceSiblings: Sockets.OllamaHuggingFaceSiblingsList.Response["siblings"] = $state([])
	let isLoadingSiblings = $state(false)

	// Check if model is already installed
	function isModelInstalled(modelName: string): boolean {
		return installedModels.some((model) => model.name.startsWith(modelName))
	}

	// Download/Pull a model (mock)
	async function downloadModel(modelName: string) {
		try {
			downloadingModels.add(modelName)
			toaster.info({ title: `Downloading ${modelName}...` })

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

	// Search for available models
	function searchAvailableModels() {
		isSearching = true
		socket.emit("ollamaSearchAvailableModels", {
			search: searchString.trim(),
			source: selectedSource
		} as Sockets.OllamaSearchAvailableModels.Call)
	}

	// Open Hugging Face download modal
	function openHuggingFaceModal(modelId: string) {
		selectedModelForDownload = modelId
		showHuggingFaceModal = true
		isLoadingSiblings = true
		huggingFaceSiblings = []
		
		socket.emit("ollamaHuggingFaceSiblingsList", {
			modelId: modelId
		} as Sockets.OllamaHuggingFaceSiblingsList.Call)
	}

	// Close Hugging Face modal
	function closeHuggingFaceModal() {
		showHuggingFaceModal = false
		selectedModelForDownload = null
		huggingFaceSiblings = []
		isLoadingSiblings = false
	}

	// Helper function to extract numeric value from quantization for sorting
	function getQuantizationSortValue(quantization: string | undefined): number {
		if (!quantization) return 0
		
		// Extract the main number (e.g., "Q4_K_M" -> 4, "Q8_0" -> 8)
		const match = quantization.match(/[Qq](\d+)/)
		return match ? parseInt(match[1]) : 0
	}

	// Sort siblings by quantization level (highest to lowest)
	let sortedSiblings = $derived([...huggingFaceSiblings].sort((a, b) => {
		const aValue = getQuantizationSortValue(a.quantization)
		const bValue = getQuantizationSortValue(b.quantization)
		return bValue - aValue // Descending order
	}))

	// Debounced search when query or source changes
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
				// Handle model pull if needed
				if (message.success) {
					// Refresh installed models to update UI
					socket.emit("ollamaModelsList", {})
					toaster.success({ title: "Model downloaded successfully" })
				}
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
				console.log("Hugging Face siblings (sorted):", $state.snapshot(huggingFaceSiblings))
			}
		)

		// Load initial installed models
		refreshInstalled()
	})

	onDestroy(() => {
		socket.off("ollamaModelsList")
		socket.off("ollamaSearchAvailableModels")
		socket.off("ollamaPullModel")
		socket.off("ollamaHuggingFaceSiblingsList")
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
										<Icons.Flame
											size={12}
											class="mr-1 inline"
										/>
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
									if (selectedSource === OllamaModelSearchSource.HUGGING_FACE) {
										openHuggingFaceModal(model.name)
									} else {
										downloadModel(model.name)
									}
								}}
								disabled={downloadingModels.has(model.name) ||
									isModelInstalled(model.name)}
							>
								{#if downloadingModels.has(model.name)}
									<Icons.Loader2
										size={14}
										class="animate-spin"
									/>
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
<Modal
	open={showHuggingFaceModal}
	onOpenChange={(e) => (showHuggingFaceModal = e.open)}
	contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl w-[50em] max-w-dvw-lg"
	backdropClasses="backdrop-blur-sm"
>
	{#snippet content()}
		<header class="flex justify-between">
			<h2 class="h2">Select Quantization</h2>
		</header>
		<article class="space-y-4">
			<div>
				<p class="text-surface-500 text-sm mb-2">
					Choose a quantization level for <strong>{selectedModelForDownload}</strong>
				</p>
				<div class="bg-surface-200-800 p-3 rounded-lg">
					<p class="text-xs text-surface-600-400">
						<strong>About Quantizations:</strong> These are compressed variants of the model that reduce file size and memory usage while maintaining good performance. Higher numbers (Q8) preserve more quality but use more resources, while lower numbers (Q4) are more efficient but with slight quality trade-offs.
					</p>
				</div>
			</div>

			{#if isLoadingSiblings}
				<div class="p-6 text-center">
					<Icons.Loader2 class="mx-auto mb-4 animate-spin" size={32} />
					<p class="text-sm opacity-75">Loading available quantizations...</p>
				</div>
			{:else if sortedSiblings.length === 0}
				<div class="p-6 text-center">
					<Icons.AlertCircle class="text-surface-500 mx-auto mb-4" size={48} />
					<p class="text-sm opacity-75">
						No GGUF quantizations are available for this model.
					</p>
				</div>
			{:else}
				<div class="space-y-3 max-h-96 overflow-y-auto">
					{#each sortedSiblings as sibling, index}
						<div class="card bg-surface-200-800 p-4">
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-2">
										<h5 class="font-semibold">
											{sibling.quantization || 'Unknown file'}
										</h5>
										
										<!-- Add special labels -->
										{#if index === 0 && sortedSiblings.length > 1}
											<span class="badge bg-blue-500 text-white text-xs px-2 py-1 rounded">
												Larger
											</span>
										{:else if index === sortedSiblings.length - 1 && sortedSiblings.length > 1}
											<span class="badge bg-green-500 text-white text-xs px-2 py-1 rounded">
												Smaller
											</span>
										{/if}
										
										{#if sibling.quantization === 'Q4_K_M'}
											<span class="badge bg-orange-500 text-white text-xs px-2 py-1 rounded">
												Recommended
											</span>
										{/if}
									</div>
									
									<div class="flex items-center gap-4 text-xs text-surface-500">
										{#if sibling.size}
											<div class="flex items-center gap-1">
												<Icons.HardDrive size={12} />
												<span>{(sibling.size / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
											</div>
										{/if}
									</div>
								</div>
								
								<button 
									class="btn btn-sm preset-filled-primary-500"
									onclick={() => {
										// TODO: Implement actual download logic
										toaster.info({ title: `Download will be implemented for ${sibling.rfilename}` })
										closeHuggingFaceModal()
									}}
								>
									<Icons.Download size={14} />
									Download
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</article>
		<footer class="flex justify-end gap-4">
			<button 
				class="btn preset-tonal"
				onclick={closeHuggingFaceModal}
			>
				Cancel
			</button>
		</footer>
	{/snippet}
</Modal>
