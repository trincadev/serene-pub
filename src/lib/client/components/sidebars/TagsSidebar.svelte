<script lang="ts">
import { onMount } from "svelte"
import * as skio from "sveltekit-io"
import * as Icons from "@lucide/svelte"

interface Props {
    onclose?: () => Promise<boolean> | undefined
}
let { onclose = $bindable() }: Props = $props()

const socket = skio.get()
let tags: { id: number; name: string; description: string }[] = $state([])
let search = $state("")
let isCreating = $state(false)
let newTagName = $state("")
let newTagDescription = $state("")

// Fetch tags from the server (implement socket endpoint as needed)
socket.on("tagsList", (msg) => {
    tags = msg.tagsList || []
})

function handleCreateClick() {
    isCreating = true
    newTagName = ""
    newTagDescription = ""
}

function handleSaveTag() {
    if (!newTagName.trim()) return
    socket.emit("createTag", { tag: { name: newTagName, description: newTagDescription } })
    isCreating = false
}

function handleCancel() {
    isCreating = false
}

let filteredTags = $derived.by(() => {
    if (!search) return tags
    return tags.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
    )
})

async function handleOnClose() {
    if (isCreating) {
        const confirmed = await onclose?.()
        if (!confirmed) return false
    }
    return true
}

onMount(() => {
    socket.emit("tagsList", {})
    onclose = handleOnClose
})
</script>
<!-- 
<div class="text-foreground h-full p-4">
    <div class="mb-2 flex gap-2">
        <button class="btn btn-sm preset-filled-primary-500" onclick={handleCreateClick} title="Create New Tag">
            <Icons.Plus size={16} />
        </button>
    </div>
    <div class="mb-4 flex items-center gap-2">
        <input
            class="input input-sm w-full"
            type="text"
            placeholder="Search tags..."
            bind:value={search}
        />
    </div>
    {#if isCreating}
        <div class="flex flex-col gap-2 mb-4">
            <input
                class="input input-sm w-full"
                type="text"
                placeholder="Tag name"
                bind:value={newTagName}
            />
            <textarea
                class="input input-sm w-full"
                rows="2"
                placeholder="Description (optional)"
                bind:value={newTagDescription}
            ></textarea>
            <div class="flex gap-2 mt-2">
                <button class="btn btn-sm" onclick={handleCancel}>Cancel</button>
                <button class="btn btn-sm preset-filled-primary-500" onclick={handleSaveTag} disabled={!newTagName.trim()}>Save</button>
            </div>
        </div>
    {/if}
    <div class="flex flex-col gap-2">
        {#if filteredTags.length === 0}
            <div class="text-muted-foreground py-8 text-center">No tags found.</div>
        {:else}
            {#each filteredTags as tag}
                <div class="hover:bg-surface-800 flex cursor-pointer items-center gap-2 rounded-lg p-2 transition">
                    <Icons.Tag size={16} />
                    <div class="flex flex-col">
                        <span class="font-medium">{tag.name}</span>
                        {#if tag.description}
                            <span class="text-xs text-muted-foreground">{tag.description}</span>
                        {/if}
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div> -->

<div class="p-4 card preset-filled-primary-500 m-4">
    <p class="mb-2"><b>Not Implemented</b></p>
    <p>Tags will go here.</p>
    <!-- Add lorebook management UI here -->
</div>

