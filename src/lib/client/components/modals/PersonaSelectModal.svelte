<script lang="ts">
	import { Modal } from "@skeletonlabs/skeleton-svelte"
	import Avatar from "../Avatar.svelte"
	import * as Icons from "@lucide/svelte"

	interface Props {
		open: boolean
		personas: Partial<SelectPersona>[]
		onOpenChange: (e: { open: boolean }) => void
		onSelect: (persona: Partial<SelectPersona> & { id: number }) => void
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
	contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-h-[95dvh] relative overflow-hidden w-[50em] max-w-95dvw"
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
		<div class="max-h-[60dvh] min-h-0 overflow-y-auto">
			<div class="relative flex flex-col pr-2 lg:flex-row lg:flex-wrap">
				{#if filtered.length === 0}
					<div class="text-surface-500 text-center">
						No personas found
					</div>
				{/if}
				{#each filtered as p}
					{#if p.id}
						<div class="flex p-1 lg:basis-1/2">
							<button
								class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full gap-3 overflow-hidden rounded p-2"
								onclick={() =>
									onSelect(
										p as Partial<SelectPersona> & {
											id: number
										}
									)}
							>
								<div class="w-fit">
									<Avatar char={p} />
								</div>
								<div
									class="relative flex w-0 min-w-0 flex-1 flex-col"
								>
									<div
										class="w-full truncate text-left font-semibold"
									>
										{p.name}
									</div>
									<div
										class="text-surface-500 group-hover:text-surface-800-200 line-clamp-2 w-full text-left text-xs"
									>
										{p.description || "No description"}
									</div>
								</div>
							</button>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/snippet}
</Modal>
