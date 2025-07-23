<script lang="ts">
	import * as skio from "sveltekit-io"
	import { getContext, onDestroy, onMount } from "svelte"
	import { Modal } from "@skeletonlabs/skeleton-svelte"
	import * as Icons from "@lucide/svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import { z } from "zod"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}

	let { onclose = $bindable() }: Props = $props()

	const socket = skio.get()
	const panelsCtx: PanelsCtx = $state(getContext("panelsCtx"))

	let tagsList: SelectTag[] = $state([])
	let selectedTag: SelectTag | null = $state(null)
	let search = $state("")
	let isCreating = $state(false)
	let isEditing = $state(false)
	let newTagName = $state("")
	let newTagDescription = $state("")
	let newTagColorPreset = $state("preset-filled-primary-500")
	let editTagName = $state("")
	let editTagDescription = $state("")
	let editTagColorPreset = $state("preset-filled-primary-500")
	let showDeleteModal = $state(false)
	let tagToDelete: SelectTag | null = $state(null)

	// Related data for selected tag
	let relatedCharacters: SelectCharacter[] = $state([])
	let relatedPersonas: SelectPersona[] = $state([])
	let relatedChats: SelectChat[] = $state([])

	// Filtered tags for display
	let filteredTags: SelectTag[] = $derived.by(() => {
		if (!search) return tagsList
		return tagsList.filter(tag => 
			tag.name.toLowerCase().includes(search.toLowerCase()) ||
			(tag.description && tag.description.toLowerCase().includes(search.toLowerCase()))
		)
	})

	// Color preset options
	const colorPresetOptions = [
		{ value: "preset-filled-primary-500", label: "Primary Filled", type: "filled", color: "primary" },
		{ value: "preset-tonal-primary", label: "Primary Tonal", type: "tonal", color: "primary" },
		{ value: "preset-outlined-primary-500", label: "Primary Outlined", type: "outlined", color: "primary" },
		{ value: "preset-filled-secondary-500", label: "Secondary Filled", type: "filled", color: "secondary" },
		{ value: "preset-tonal-secondary", label: "Secondary Tonal", type: "tonal", color: "secondary" },
		{ value: "preset-outlined-secondary-500", label: "Secondary Outlined", type: "outlined", color: "secondary" },
		{ value: "preset-filled-tertiary-500", label: "Tertiary Filled", type: "filled", color: "tertiary" },
		{ value: "preset-tonal-tertiary", label: "Tertiary Tonal", type: "tonal", color: "tertiary" },
		{ value: "preset-outlined-tertiary-500", label: "Tertiary Outlined", type: "outlined", color: "tertiary" },
		{ value: "preset-filled-success-500", label: "Success Filled", type: "filled", color: "success" },
		{ value: "preset-tonal-success", label: "Success Tonal", type: "tonal", color: "success" },
		{ value: "preset-outlined-success-500", label: "Success Outlined", type: "outlined", color: "success" },
		{ value: "preset-filled-warning-500", label: "Warning Filled", type: "filled", color: "warning" },
		{ value: "preset-tonal-warning", label: "Warning Tonal", type: "tonal", color: "warning" },
		{ value: "preset-outlined-warning-500", label: "Warning Outlined", type: "outlined", color: "warning" },
		{ value: "preset-filled-error-500", label: "Error Filled", type: "filled", color: "error" },
		{ value: "preset-tonal-error", label: "Error Tonal", type: "tonal", color: "error" },
		{ value: "preset-outlined-error-500", label: "Error Outlined", type: "outlined", color: "error" },
		{ value: "preset-filled-surface-500", label: "Surface Filled", type: "filled", color: "surface" },
		{ value: "preset-tonal-surface", label: "Surface Tonal", type: "tonal", color: "surface" },
		{ value: "preset-outlined-surface-500", label: "Surface Outlined", type: "outlined", color: "surface" }
	]

	function handleCreateClick() {
		isCreating = true
		newTagName = ""
		newTagDescription = ""
		newTagColorPreset = "preset-filled-primary-500"
	}

	function handleEditClick() {
		if (!selectedTag) return
		isEditing = true
		editTagName = selectedTag.name
		editTagDescription = selectedTag.description || ""
		editTagColorPreset = selectedTag.colorPreset || "preset-filled-primary-500"
	}

	function handleDeleteClick() {
		if (!selectedTag) return
		tagToDelete = selectedTag
		showDeleteModal = true
	}

	function handleTagClick(tag: SelectTag) {
		selectedTag = tag
		// Load related data for the selected tag
		socket.emit("tagRelatedData", { tagId: tag.id })
	}

	function createTag() {
		if (!newTagName.trim()) return
		
		const tag: InsertTag = {
			name: newTagName.trim(),
			description: newTagDescription.trim() || null,
			colorPreset: newTagColorPreset
		}
		
		socket.emit("createTag", { tag })
		isCreating = false
	}

	function updateTag() {
		if (!selectedTag || !editTagName.trim()) return
		
		const tag: SelectTag = {
			...selectedTag,
			name: editTagName.trim(),
			description: editTagDescription.trim() || null,
			colorPreset: editTagColorPreset
		}
		
		socket.emit("updateTag", { tag })
		isEditing = false
	}

	function confirmDelete() {
		if (!tagToDelete) return
		socket.emit("deleteTag", { id: tagToDelete.id })
		showDeleteModal = false
		tagToDelete = null
		if (selectedTag?.id === tagToDelete.id) {
			selectedTag = null
		}
	}

	function cancelDelete() {
		showDeleteModal = false
		tagToDelete = null
	}

	function cancelCreate() {
		isCreating = false
		newTagName = ""
		newTagDescription = ""
		newTagColorPreset = "preset-filled-primary-500"
	}

	function cancelEdit() {
		isEditing = false
		editTagName = ""
		editTagDescription = ""
		editTagColorPreset = "preset-filled-primary-500"
	}

	function handleCharacterClick(character: SelectCharacter) {
		panelsCtx.digest.characterId = character.id
		panelsCtx.openPanel({ key: "characters", toggle: false })
	}

	function handlePersonaClick(persona: SelectPersona) {
		panelsCtx.digest.personaId = persona.id
		panelsCtx.openPanel({ key: "personas", toggle: false })
	}

	function handleChatClick(chat: SelectChat) {
		panelsCtx.openPanel({ key: "chats", toggle: false })
		// Navigate to specific chat
		window.location.href = `/chats/${chat.id}`
	}

	onMount(() => {
		socket.on("tagsList", (msg: any) => {
			tagsList = msg.tagsList || []
		})

		socket.on("createTag", (msg: any) => {
			toaster.success({
				title: "Tag Created",
				description: `Tag "${msg.tag.name}" created successfully.`
			})
		})

		socket.on("updateTag", (msg: any) => {
			selectedTag = msg.tag
			toaster.success({
				title: "Tag Updated",
				description: `Tag "${msg.tag.name}" updated successfully.`
			})
		})

		socket.on("deleteTag", (msg: any) => {
			toaster.success({
				title: "Tag Deleted",
				description: "Tag deleted successfully."
			})
		})

		socket.on("tagRelatedData", (msg: any) => {
			relatedCharacters = msg.characters || []
			relatedPersonas = msg.personas || []
			relatedChats = msg.chats || []
		})

		socket.emit("tagsList", {})
		
		onclose = async () => {
			return true
		}
	})

	onDestroy(() => {
		socket.off("tagsList")
		socket.off("createTag") 
		socket.off("updateTag")
		socket.off("deleteTag")
		socket.off("tagRelatedData")
		onclose = undefined
	})
</script>

<div class="text-foreground h-full p-4">
	{#if selectedTag && !isEditing}
		<!-- Selected tag view -->
		<div class="mb-4">
			<button
				class="btn btn-sm preset-filled-surface-500 mb-3"
				onclick={() => { selectedTag = null }}
			>
				<Icons.ArrowLeft size={16} />
				Back to Tags
			</button>

			<div class="border border-primary-500 rounded-lg p-4 mb-4 bg-surface-50-950">
				<div class="flex items-center justify-between mb-2">
					<h2 class="text-xl font-bold text-primary-500">{selectedTag.name}</h2>
					<div class="flex gap-2">
						<button
							class="btn btn-sm text-primary-500 p-2"
							onclick={handleEditClick}
							title="Rename Tag"
						>
							<Icons.Edit size={16} />
						</button>
						<button
							class="btn btn-sm text-error-500 p-2"
							onclick={handleDeleteClick}
							title="Delete Tag"
						>
							<Icons.Trash2 size={16} />
						</button>
					</div>
				</div>
				{#if selectedTag.description}
					<p class="text-muted-foreground text-sm">{selectedTag.description}</p>
				{/if}
			</div>

			<!-- Related sections -->
			{#if relatedCharacters.length > 0}
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
						<Icons.User size={18} />
						Characters ({relatedCharacters.length})
					</h3>
					<div class="grid gap-2">
						{#each relatedCharacters as character}
							<button
								class="p-3 rounded-lg bg-surface-100-900 hover:bg-surface-200-800 transition-colors text-left"
								onclick={() => handleCharacterClick(character)}
							>
								<div class="font-medium">{character.nickname || character.name}</div>
								{#if character.description}
									<div class="text-sm text-muted-foreground line-clamp-2 mt-1">
										{character.description}
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if relatedPersonas.length > 0}
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
						<Icons.UserCog size={18} />
						Personas ({relatedPersonas.length})
					</h3>
					<div class="grid gap-2">
						{#each relatedPersonas as persona}
							<button
								class="p-3 rounded-lg bg-surface-100-900 hover:bg-surface-200-800 transition-colors text-left"
								onclick={() => handlePersonaClick(persona)}
							>
								<div class="font-medium">{persona.name}</div>
								{#if persona.description}
									<div class="text-sm text-muted-foreground line-clamp-2 mt-1">
										{persona.description}
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if relatedChats.length > 0}
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
						<Icons.MessageSquare size={18} />
						Chats ({relatedChats.length})
					</h3>
					<div class="grid gap-2">
						{#each relatedChats as chat}
							<button
								class="p-3 rounded-lg bg-surface-100-900 hover:bg-surface-200-800 transition-colors text-left"
								onclick={() => handleChatClick(chat)}
							>
								<div class="font-medium">{chat.name || 'Unnamed Chat'}</div>
								{#if chat.scenario}
									<div class="text-sm text-muted-foreground line-clamp-2 mt-1">
										{chat.scenario}
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

	{:else if isCreating}
		<!-- Create tag form -->
		<div>
			<h1 class="mb-4 text-lg font-bold">Create New Tag</h1>
			<div class="mt-4 mb-4 flex gap-2" role="group" aria-label="Form actions">
				<button
					class="btn btn-sm preset-filled-surface-500 w-full"
					onclick={cancelCreate}
				>
					Cancel
				</button>
				<button
					class="btn btn-sm preset-filled-primary-500 w-full"
					onclick={createTag}
					disabled={!newTagName.trim()}
				>
					Create Tag
				</button>
			</div>
			<div class="space-y-4">
				<div>
					<label class="block font-semibold mb-1" for="tagName">Name</label>
					<input
						name="tagName"
						type="text"
						class="input w-full"
						bind:value={newTagName}
						placeholder="Enter tag name"
					/>
				</div>
				<div>
					<label class="block font-semibold mb-1" for="tagDescription">Description (Optional)</label>
					<textarea
						name="tagDescription"
						class="input w-full"
						bind:value={newTagDescription}
						placeholder="Enter tag description"
						rows="3"
					></textarea>
				</div>
				<div>
					<label class="block font-semibold mb-1" for="colorPreset">Color Preset</label>
					<select
						name="colorPreset"
						class="input w-full"
						bind:value={newTagColorPreset}
					>
						{#each colorPresetOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<div class="mt-2">
						<span class="text-sm text-muted-foreground">Preview:</span>
						<button type="button" class="chip {newTagColorPreset} ml-2">
							{newTagName.trim() || 'Tag Preview'}
						</button>
					</div>
				</div>
			</div>
		</div>

	{:else if isEditing}
		<!-- Edit tag form -->
		<div>
			<h1 class="mb-4 text-lg font-bold">Edit Tag</h1>
			<div class="mt-4 mb-4 flex gap-2" role="group" aria-label="Form actions">
				<button
					class="btn btn-sm preset-filled-surface-500 w-full"
					onclick={cancelEdit}
				>
					Cancel
				</button>
				<button
					class="btn btn-sm preset-filled-primary-500 w-full"
					onclick={updateTag}
					disabled={!editTagName.trim()}
				>
					Update Tag
				</button>
			</div>
			<div class="space-y-4">
				<div>
					<label class="block font-semibold mb-1" for="editTagName">Name</label>
					<input
						name="editTagName"
						type="text"
						class="input w-full"
						bind:value={editTagName}
						placeholder="Enter tag name"
					/>
				</div>
				<div>
					<label class="block font-semibold mb-1" for="editTagDescription">Description (Optional)</label>
					<textarea
						name="editTagDescription"
						class="input w-full"
						bind:value={editTagDescription}
						placeholder="Enter tag description"
						rows="3"
					></textarea>
				</div>
				<div>
					<label class="block font-semibold mb-1" for="editColorPreset">Color Preset</label>
					<select
						name="editColorPreset"
						class="input w-full"
						bind:value={editTagColorPreset}
					>
						{#each colorPresetOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<div class="mt-2">
						<span class="text-sm text-muted-foreground">Preview:</span>
						<button type="button" class="chip {editTagColorPreset} ml-2">
							{editTagName.trim() || 'Tag Preview'}
						</button>
					</div>
				</div>
			</div>
		</div>

	{:else}
		<!-- Main tags list view -->
		<div class="mb-2 flex gap-2">
			<button
				class="btn btn-sm preset-filled-primary-500"
				onclick={handleCreateClick}
				title="Create New Tag"
			>
				<Icons.Plus size={16} />
			</button>
		</div>

		<div class="mb-4 flex items-center gap-2">
			<input
				type="text"
				placeholder="Search tags..."
				class="input"
				bind:value={search}
			/>
		</div>

		{#if filteredTags.length === 0}
			<div class="text-muted-foreground py-8 text-center w-100 relative">
				No tags found.
			</div>
		{:else}
			<!-- Beautiful multi-row flex layout using Skeleton chips -->
			<div class="flex flex-wrap gap-2">
				{#each filteredTags as tag}
					<button
						type="button"
						class="chip {tag.colorPreset || 'preset-filled-primary-500'} transition-all duration-200"
						onclick={() => handleTagClick(tag)}
						title={tag.description || tag.name}
					>
						{tag.name}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Delete confirmation modal -->
{#if showDeleteModal}
	<Modal
		open={showDeleteModal}
		onOpenChange={(e) => (showDeleteModal = e.open)}
		contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-dvw-sm"
		backdropClasses="backdrop-blur-sm"
	>
		{#snippet content()}
			<div class="p-6">
				<h2 class="mb-2 text-lg font-bold">Delete Tag?</h2>
				<p class="mb-4">
					Are you sure you want to delete the tag "{tagToDelete?.name}"? This action
					cannot be undone and will remove the tag from all associated items.
				</p>
				<div class="flex justify-end gap-2">
					<button
						class="btn preset-filled-surface-500"
						onclick={cancelDelete}
					>
						Cancel
					</button>
					<button
						class="btn preset-filled-error-500"
						onclick={confirmDelete}
					>
						Delete
					</button>
				</div>
			</div>
		{/snippet}
	</Modal>
{/if}
