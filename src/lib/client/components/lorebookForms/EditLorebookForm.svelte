<script lang="ts">
	import { onMount } from "svelte"
	import * as Icons from "@lucide/svelte"
	import { Tabs } from "@skeletonlabs/skeleton-svelte"
	import IconBook from "@lucide/svelte/icons/book-open"
	import IconUser from "@lucide/svelte/icons/user"
	import IconClock from "@lucide/svelte/icons/clock"

	interface Props {
		editLorebook?: any // Pass the full lorebook object for editing, or undefined for create
		showEditLorebookForm: boolean // Controls visibility of the form
	}

	let {
		editLorebook = $bindable(undefined),
		showEditLorebookForm = $bindable()
	}: Props = $props()

	let lorebook = $state(editLorebook)
	let isCreating = $state(!lorebook)
	let name = $state(lorebook?.name || "")
	let description = $state(lorebook?.description || "")
	let worldLoreEntries = $state(lorebook?.worldLoreEntries || [])
	let characterLoreEntries = $state(lorebook?.characterLoreEntries || [])
	let historyEntries = $state(lorebook?.historyEntries || [])

	let tab = $state("world")

	function handleSave() {
		// TODO: emit save event with updated data
		showEditLorebookForm = false
	}
	function handleCancel() {
		showEditLorebookForm = false
	}
	function handleAddWorldLore() {
		worldLoreEntries = [...worldLoreEntries, { name: "", content: "" }]
	}
	function handleAddCharacterLore() {
		characterLoreEntries = [
			...characterLoreEntries,
			{ name: "", content: "" }
		]
	}
	function handleAddHistory() {
		historyEntries = [...historyEntries, { name: "", content: "" }]
	}
</script>

<div class="flex flex-col gap-6 rounded-lg border border-surface-500/25 p-2 min-h-full">
    <h2 class="text-lg font-bold">
		Edit: {lorebook.name}
    </h2>
	<div class="flex gap-2">
		<button
			class="btn btn-sm preset-filled-surface-500 w-full"
			onclick={handleCancel}
		>
			Cancel
		</button>
		<button
			class="btn btn-sm preset-filled-success-500 w-full"
			onclick={handleSave}
		>
			Save
		</button>
	</div>
	<div>
		<label class="font-semibold" for="lorebookName">Lorebook Name*</label>
		<input
			id="lorebookName"
			class="input input-lg w-full"
			type="text"
			placeholder="Enter lorebook name"
			bind:value={name}
			required
		/>
	</div>
	<div>
		<label class="font-semibold" for="lorebookDescription">
			Description
		</label>
		<textarea
			id="lorebookDescription"
			class="textarea input-lg w-full"
			placeholder="Describe this lorebook (optional)"
			bind:value={description}
			rows={2}
		></textarea>
	</div>
	<Tabs value={tab} onValueChange={(e) => (tab = e.value)}>
		{#snippet list()}
			<Tabs.Control value="world">
				{#snippet lead()}<IconBook size={20} />{/snippet}
				{#if tab === "world"}
					World Lore
				{/if}
			</Tabs.Control>
			<Tabs.Control value="character">
				{#snippet lead()}<IconUser size={20} />{/snippet}
				{#if tab === "character"}
					Character Lore
				{/if}
			</Tabs.Control>
			<Tabs.Control value="history">
				{#snippet lead()}<IconClock size={20} />{/snippet}
				{#if tab === "history"}
					History
				{/if}
			</Tabs.Control>
		{/snippet}
		{#snippet content()}
			<Tabs.Panel value="world">
				<div class="mt-2 flex flex-col gap-2">
					{#each worldLoreEntries as entry, i}
						<div class="flex flex-col gap-1 rounded border p-2">
							<input
								class="input"
								placeholder="Entry Name"
								bind:value={entry.name}
							/>
							<textarea
								class="textarea"
								placeholder="Content"
								bind:value={entry.content}
								rows={2}
							></textarea>
						</div>
					{/each}
					<button
						class="btn btn-xs preset-filled-primary-500 mt-2"
						onclick={handleAddWorldLore}
					>
						<Icons.Plus size={14} /> Add World Lore
					</button>
				</div>
			</Tabs.Panel>
			<Tabs.Panel value="character">
				<div class="mt-2 flex flex-col gap-2">
					{#each characterLoreEntries as entry, i}
						<div class="flex flex-col gap-1 rounded border p-2">
							<input
								class="input"
								placeholder="Entry Name"
								bind:value={entry.name}
							/>
							<textarea
								class="textarea"
								placeholder="Content"
								bind:value={entry.content}
								rows={2}
							></textarea>
						</div>
					{/each}
					<button
						class="btn btn-xs preset-filled-primary-500 mt-2"
						onclick={handleAddCharacterLore}
					>
						<Icons.Plus size={14} /> Add Character Lore
					</button>
				</div>
			</Tabs.Panel>
			<Tabs.Panel value="history">
				<div class="mt-2 flex flex-col gap-2">
					{#each historyEntries as entry, i}
						<div class="flex flex-col gap-1 rounded border p-2">
							<input
								class="input"
								placeholder="Entry Name"
								bind:value={entry.name}
							/>
							<textarea
								class="textarea"
								placeholder="Content"
								bind:value={entry.content}
								rows={2}
							></textarea>
						</div>
					{/each}
					<button
						class="btn btn-xs preset-filled-primary-500 mt-2"
						onclick={handleAddHistory}
					>
						<Icons.Plus size={14} /> Add History
					</button>
				</div>
			</Tabs.Panel>
		{/snippet}
	</Tabs>
</div>
