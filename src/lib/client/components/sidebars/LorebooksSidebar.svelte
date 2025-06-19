<script lang="ts">
    import { onMount } from "svelte"
    import skio from "sveltekit-io"
    import * as Icons from "@lucide/svelte"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    const socket = skio.get()
    let lorebooksList: any[] = $state([])
    let search = $state("")
    let isCreating = $state(false)

    async function handleOnClose() {
        return true
    }

    function handleCreateClick() {
        isCreating = true
    }

    $effect(() => {
        // Filtered list effect if needed
    })

    let filteredLorebooks = $derived.by(() => {
        if (!search) return lorebooksList
        return lorebooksList.filter((l) =>
            l.name.toLowerCase().includes(search.toLowerCase()) ||
            (l.description && l.description.toLowerCase().includes(search.toLowerCase()))
        )
    })

    onMount(() => {
        onclose = handleOnClose
        socket.on("lorebooksList", (msg) => {
            lorebooksList = msg.lorebooksList
        })
        socket.emit("lorebooksList", {})
    })
</script>

<div class="p-4">
    <div class="mb-2 flex gap-2">
        <button
            class="btn btn-sm preset-filled-primary-500"
            onclick={handleCreateClick}
            title="Create New Lorebook"
        >
            <Icons.Plus size={16} />
        </button>
    </div>
    <div class="mb-4 flex items-center gap-2">
        <input
            type="text"
            placeholder="Search lorebooks..."
            class="input"
            bind:value={search}
        />
    </div>
    <div class="flex flex-col gap-2">
        {#if filteredLorebooks.length === 0}
            <div class="text-muted-foreground py-8 text-center">
                No lorebooks found.
            </div>
        {:else}
            {#each filteredLorebooks as l}
                <div class="sidebar-list-item">
                    <span class="text-muted-foreground w-[2.5em] text-xs">
                        #{l.id}
                    </span>
                    <div class="min-w-0 flex-1">
                        <div class="truncate font-semibold">
                            {l.name}
                        </div>
                        {#if l.description}
                            <div class="text-muted-foreground truncate text-xs">
                                {l.description}
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>
