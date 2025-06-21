<script lang="ts">
	import * as Icons from "@lucide/svelte";
	import { toaster } from "$lib/client/utils/toaster";
	import * as skio from "sveltekit-io";
	import { onMount } from "svelte"

	interface Props {
		lorebookId: number;
	}

	const socket = skio.get();

	let { lorebookId = $bindable() }: Props = $props();
	let worldLoreEntries: any[] = $state([]);

	let entry: SelectWorldLoreEntry | undefined = $state()
	let name = entry?.name || "";
	let content = entry?.content || "";
	let keys = entry?.keys ? entry.keys.join(", ") : "";
	let useRegex = entry?.useRegex || false;
	let caseSensitive = entry?.caseSensitive || false;
	let priority = entry?.priority || 0;
	let constant = entry?.constant || false;
	let enabled = entry?.enabled ?? true;

	function handleSave() {
		if (!name.trim()) {
			toaster.error({title: "Name is required"});
			return;
		}
		// dispatch("save", {
		// 	...entry,
		// 	name,
		// 	content,
		// 	keys: keys.split(",").map(k => k.trim()).filter(Boolean),
		// 	useRegex,
		// 	caseSensitive,
		// 	priority,
		// 	constant,
		// 	enabled,
		// 	lorebookId
		// });
		// showWorldLoreForm = false;
	}

	function handleCancel() {
		// dispatch("cancel");
		// showWorldLoreForm = false;
	}

	socket.on("worldLoreEntryList", (msg: Sockets.WorldLoreEntryList.Response) => {
		if (msg.worldLoreEntryList.length && msg.worldLoreEntryList[0].lorebookId === lorebookId) {
			worldLoreEntries = msg.worldLoreEntryList;
		}
	})

	socket.on("createWorldLoreEntry", (msg: Sockets.CreateWorldLoreEntry.Response) => {
		if (msg.worldLoreEntry && msg.worldLoreEntry.lorebookId === lorebookId) {
			toaster.success({title: "World Lore Entry created"});
		}
	});

	socket.on("updateWorldLoreEntry", (msg: Sockets.UpdateWorldLoreEntry.Response) => {
		if (msg.worldLoreEntry && msg.worldLoreEntry.lorebookId === lorebookId) {
			toaster.success({title: "World Lore Entry updated"});
		}
	});
	socket.on("deleteWorldLoreEntry", (msg: Sockets.DeleteWorldLoreEntry.Response) => {
		if (msg.worldLoreEntryId && worldLoreEntries.some(e => e.id === msg.worldLoreEntryId)) {
			toaster.success({title: "World Lore Entry deleted"});
			worldLoreEntries = worldLoreEntries.filter(e => e.id !== msg.worldLoreEntryId);
		}
	});

	onMount(() => {
		const req: Sockets.WorldLoreEntryList.Call = { lorebookId: lorebookId };
		socket.emit("worldLoreEntryList", req);
	})
</script>

{#each worldLoreEntries as entry (entry.id)}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			<h3 class="text-lg font-semibold">{entry.name}</h3>
			<button class="btn btn-sm preset-filled-surface-500" onclick={() => {
				// entry = entry;
				name = entry.name;
				content = entry.content;
				keys = entry.keys ? entry.keys.join(", ") : "";
				useRegex = entry.useRegex || false;
				caseSensitive = entry.caseSensitive || false;
				priority = entry.priority || 0;
				constant = entry.constant || false;
				enabled = entry.enabled ?? true;
			}}>
				<Icons.Edit size={16} />
			</button>
			<button class="btn btn-sm preset-filled-error-500" onclick={() => {
				worldLoreEntries = worldLoreEntries.filter(e => e.id !== entry.id);
			}}>
				<Icons.Trash size={16} />
			</button>
		</div>
		<div>
			<label class="font-semibold" for="entryName">Name</label>
			<input
				id="entryName"
				class="input input-lg w-full"
				type="text"
				bind:value={name}
				required
			/>
		</div>
		<div>
			<label class="font-semibold" for="entryContent">Content</label>
			<textarea
				id="entryContent"
				class="textarea textarea-lg w-full"
				rows="4"
				bind:value={content}
				required
			></textarea>
		</div>
		<div>
			<label class="font-semibold" for="entryKeys">Keys (comma-separated)</label>
			<input
				id="entryKeys"
				class="input input-lg w-full"
				type="text"
				placeholder="key1, key2, key3"
				bind:value={keys}
			/>
		</div>
		<div class="flex items-center gap-4">
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={useRegex}
					class="checkbox"
				/>
				<span class="ml-2">Use Regex</span>
			</label>
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={caseSensitive}
					class="checkbox"
				/>
				<span class="ml-2">Case Sensitive</span>
			</label>
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={constant}
					class="checkbox"
				/>
				<span class="ml-2">Constant</span>
			</label>
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={enabled}
					class="checkbox"
				/>
				<span class="ml-2">Enabled</span>
			</label>
			<div>
				<label for="entryPriority" class="font-semibold">Priority</label>
				<input
					id="entryPriority"
					type="number"
					min="0"
					max="1000"
					bind:value={priority}
					class="input input-lg w-full max-w-xs"
				/>
			</div>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-sm preset-filled-surface-500 w-full" onclick={handleCancel}>
				Cancel
			</button>
			<button class="btn btn-sm preset-filled-success-500 w-full" onclick={handleSave}>
				<Icons.Save size={16} />
				Save
			</button>
		</div>
	</div>
{/each}
