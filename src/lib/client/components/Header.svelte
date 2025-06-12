<script lang="ts">
    import * as Icons from "@lucide/svelte"
    import { getContext, onMount, onDestroy } from "svelte"

    let panelsCtx: PanelsCtx = $state(getContext("panelsCtx"))

    // Prevent body scroll when mobile menu is open
    $effect(() => {
        if (panelsCtx.isMobileMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
    })

    // Close on Escape key
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && panelsCtx.isMobileMenuOpen) {
            panelsCtx.isMobileMenuOpen = false

        }
    }
    onMount(() => {
        window.addEventListener("keydown", handleKeydown)
        return () => window.removeEventListener("keydown", handleKeydown)
    })

    
</script>

<header class="sticky top-0 z-30 w-full">
    <div
        class="bg-surface-100-900 bg-opacity-25 relative mx-auto flex w-full justify-between px-4 py-2 backdrop-blur md:w-[50%]"
    >

        <!-- Desktop left nav -->
        <div class="hidden flex-1 justify-start gap-2 md:flex">
            {#each Object.entries(panelsCtx.leftNav) as [key, item]}
                <button
                    class="btn-ghost"
                    title={item.title}
                    onclick={() => panelsCtx.openPanel(key)}
                >
                    <item.icon class="text-foreground h-5 w-5" />
                </button>
            {/each}
        </div>

        <!-- Title (centered absolutely for desktop) -->
        <div
            class="flex w-auto flex-0 justify-center ml-2 md:ml-0 md:absolute md:top-1/2 md:left-1/2 md:w-auto md:-translate-x-1/2 md:-translate-y-1/2 pointer-events-none"
        >
            <a
                class="text-foreground funnel-display text-xl font-bold tracking-tight whitespace-nowrap pointer-events-auto"
                href="/">Serene Pub</a>
        </div>

        <!-- Desktop right nav -->
        <div class="hidden flex-1 justify-end gap-2 md:flex">
            {#each Object.entries(panelsCtx.rightNav) as [key, item]}
                <button
                    class="btn-ghost"
                    title={item.title}
                    onclick={() => panelsCtx.openPanel(key)}
                >
                    <item.icon class="text-foreground h-5 w-5" />
                </button>
            {/each}
        </div>

		<div class="flex items-center gap-2 md:hidden">
            <button
                class="btn preset-tonal"
                aria-label="Open menu"
                onclick={() => {
                    panelsCtx.isMobileMenuOpen = true
                }}
            >
                <Icons.Menu class="text-foreground h-6 w-6" />
            </button>
        </div>
    </div>
</header>

<style>
    header {
        display: flex;
        justify-content: space-between;
    }
</style>
