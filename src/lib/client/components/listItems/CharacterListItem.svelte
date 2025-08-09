<script lang="ts">
	import { Avatar } from "@skeletonlabs/skeleton-svelte"
	import * as Icons from "@lucide/svelte"
	import SidebarListItem from "../SidebarListItem.svelte"

	interface Props {
		character: Sockets.CharacterList.Response["characterList"][0]
		onclick?: (character: Sockets.CharacterList.Response["characterList"][0]) => void
		onEdit?: (id: number) => void
		onDelete?: (id: number) => void
		showControls?: boolean
		contentTitle?: string
		classes?: string
	}

	let {
		character,
		onclick,
		onEdit,
		onDelete,
		showControls = true,
		contentTitle = "Go to character",
		classes = ""
	}: Props = $props()

	function handleClick() {
		onclick?.(character)
	}

	function handleEditClick(e: MouseEvent) {
		e.stopPropagation()
		onEdit?.(character.id!)
	}

	function handleDeleteClick(e: MouseEvent) {
		e.stopPropagation()
		onDelete?.(character.id!)
	}
</script>

<SidebarListItem
	id={character.id}
	onclick={handleClick}
	{contentTitle}
	classes={character.isFavorite ? "border border-primary-500 " + classes : classes}
>
	{#snippet content()}
		<Avatar
			src={character.avatar || ""}
			size="w-[4em] h-[4em] min-w-[4em] min-h-[4em]"
			imageClasses="object-cover"
			name={character.nickname || character.name!}
		>
			<Icons.User size={36} />
		</Avatar>
		<div class="relative flex min-w-0 flex-1 gap-2">
			<div class="relative min-w-0 flex-1">
				<div class="truncate text-left font-semibold">
					{character.nickname || character.name}
				</div>
				{#if character.description}
					<div class="text-muted-foreground line-clamp-2 text-left text-xs">
						{character.description}
					</div>
				{/if}
			</div>
		</div>
	{/snippet}
	{#snippet controls()}
		{#if showControls && (onEdit || onDelete)}
			<div class="flex flex-col gap-4">
				{#if onEdit}
					<button
						class="btn btn-sm text-primary-500 p-2"
						onclick={handleEditClick}
						title="Edit Character"
					>
						<Icons.Edit size={16} />
					</button>
				{/if}
				{#if onDelete}
					<button
						class="btn btn-sm text-error-500 p-2"
						onclick={handleDeleteClick}
						title="Delete Character"
					>
						<Icons.Trash2 size={16} />
					</button>
				{/if}
			</div>
		{/if}
	{/snippet}
</SidebarListItem>