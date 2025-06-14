<script lang="ts">
	import { Modal } from "@skeletonlabs/skeleton-svelte"
	import Avatar from "../Avatar.svelte"
	import * as Icons from "@lucide/svelte"

	interface Props {
		open: boolean
		characters: Partial<SelectCharacter>[]
		onOpenChange: (e: { open: boolean }) => void
		onSelect: (character: Partial<SelectCharacter>) => void
	}

	let {
		open = $bindable(),
		characters = [],
		onOpenChange,
		onSelect
	}: Props = $props()
	let search = $state("")

	let filtered = $derived.by(() => {
		if (!search.trim()) return characters
		return characters.filter(
			(c) =>
				c.name!.toLowerCase().includes(search.toLowerCase()) ||
				(c.nickname &&
					c.nickname.toLowerCase().includes(search.toLowerCase())) ||
				(c.description &&
					c.description
						.toLowerCase()
						.includes(search.toLowerCase())) ||
				(c.creatorNotes &&
					c.creatorNotes.toLowerCase().includes(search.toLowerCase()))
		)
	})
</script>

<Modal
	{open}
	{onOpenChange}
	contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-md"
	backdropClasses="backdrop-blur-sm"
>
	{#snippet content()}
		<header class="mb-2 flex items-center justify-between">
			<h2 class="h2">Select Character</h2>
			<button
				class="btn btn-sm"
				onclick={() => onOpenChange({ open: false })}
			>
				<Icons.X size={20} />
			</button>
		</header>
		<input
			class="input mb-4 w-full"
			type="text"
			placeholder="Search characters..."
			bind:value={search}
		/>
		<div class="flex flex-col gap-2">
			{#each filtered as c}
				<button
					class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full max-w-[25em] gap-3 overflow-hidden rounded p-3"
					onclick={() => onSelect(c)}
				>
					<div class="w-fit">
						<Avatar char={c} />
					</div>
					<div class="relative flex w-0 min-w-0 flex-1 flex-col">
						<div class="w-full truncate text-left font-semibold">
							{c.nickname || c.name}
						</div>
						<div
							class="text-surface-500 group-hover:text-surface-800-200 line-clamp-2 w-full text-left text-xs"
						>
							{c.creatorNotes || c.description || ""}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/snippet}
</Modal>
