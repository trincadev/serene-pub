<script lang="ts">
	import { Modal } from "@skeletonlabs/skeleton-svelte"
	import Avatar from "../Avatar.svelte"
	import * as Icons from "@lucide/svelte"

	interface Props {
		open: boolean
		personas: Partial<SelectPersona>[]
		onOpenChange: (e: { open: boolean }) => void
		onSelect: (persona: Partial<SelectPersona>) => void
	}

	let {
		open = $bindable(),
		personas = [],
		onOpenChange,
		onSelect
	}: Props = $props()
	let search = $state("")

	let filtered = $derived.by(() => {
		if (!search.trim()) return personas
		return personas.filter(
			(p) =>
				p.name!.toLowerCase().includes(search.toLowerCase()) ||
				(p.description &&
					p.description.toLowerCase().includes(search.toLowerCase()))
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
			<h2 class="h2">Select Persona</h2>
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
			placeholder="Search personas..."
			bind:value={search}
		/>
		<div class="flex flex-col gap-2">
			{#each filtered as p}
				<button
					class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full max-w-[25em] gap-3 overflow-hidden rounded p-3"
					onclick={() => onSelect(p)}
					title="Select Persona"
				>
					<div class="w-fit">
						<Avatar char={p} />
					</div>
					<div class="relative flex w-0 min-w-0 flex-1 flex-col">
						<div class="w-full truncate text-left font-semibold">
							{p.name}
						</div>
						<div
							class="text-surface-500 group-hover:text-surface-800-200 line-clamp-2 w-full text-left text-xs"
						>
							{p.description || ""}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/snippet}
</Modal>
