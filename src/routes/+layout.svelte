<script lang="ts">
    import Header from "../lib/client/components/Header.svelte"
    import "../app.css"
    import * as Icons from "@lucide/svelte"
    import { fly, fade } from "svelte/transition"
    import { setContext } from "svelte"
    import SamplingSidebar from "../lib/client/components/sidebars/SamplingSidebar.svelte"
    import ConnectionsSidebar from "../lib/client/components/sidebars/ConnectionsSidebar.svelte"
    import ContextSidebar from "../lib/client/components/sidebars/ContextSidebar.svelte"
    import LorebooksSidebar from "../lib/client/components/sidebars/LorebooksSidebar.svelte"
    import PersonasSidebar from "../lib/client/components/sidebars/PersonasSidebar.svelte"
    import CharactersSidebar from "../lib/client/components/sidebars/CharactersSidebar.svelte"
    import ChatsSidebar from "../lib/client/components/sidebars/ChatsSidebar.svelte"
    import PromptsSidebar from "../lib/client/components/sidebars/PromptsSidebar.svelte"
    import TagsSidebar from "../lib/client/components/sidebars/TagsSidebar.svelte"
    import skio from "sveltekit-io"
    import { Toaster } from "@skeletonlabs/skeleton-svelte"
    import { toaster } from "$lib/client/utils/toaster"
    import SettingsSidebar from "$lib/client/components/sidebars/SettingsSidebar.svelte"

    interface Props {
        children?: import("svelte").Snippet
    }

    let { children }: Props = $props()

    const socket = skio.get()

    let userCtx: { user: any } = $state({} as { user: any })
    let panelsCtx: PanelsCtx = $state({
        leftPanel: null,
        rightPanel: null,
        mobilePanel: null,
        isMobileMenuOpen: false,
        openPanel,
        closePanel,
        onLeftPanelClose: undefined,
        onRightPanelClose: undefined,
        onMobilePanelClose: undefined,
        leftNav: {
            sampling: { icon: Icons.SlidersHorizontal, title: "SamplingConfig" },
            connections: { icon: Icons.Cable, title: "Connections" },
            contexts: { icon: Icons.BookOpenText, title: "Contexts" },
            prompts: { icon: Icons.MessageCircle, title: "Prompts" },
            settings: { icon: Icons.Settings, title: "Settings" }
        },
        rightNav: {
            personas: { icon: Icons.UserCog, title: "Personas" },
            characters: { icon: Icons.Users, title: "Characters" },
            lorebooks: { icon: Icons.BookMarked, title: "Lorebooks" },
            tags: { icon: Icons.Tag, title: "Tags" },
            chats: { icon: Icons.MessageSquare, title: "Chats" }
        }
    })

    socket.on("user", (message) => {
        userCtx.user = message.user
    })

    socket.on("error", (message: Sockets.Error.Response) => {
        toaster.error({ title: "Error", description: message.error })
    })

    socket.emit("user", {})

    function openPanel(which: string) {
        // Determine which nav the key belongs to
        const isLeft = Object.prototype.hasOwnProperty.call(panelsCtx.leftNav, which)
        const isRight = Object.prototype.hasOwnProperty.call(panelsCtx.rightNav, which)
        const isMobile = window.innerWidth < 768
        if (isMobile) {
            if (panelsCtx.mobilePanel === which) {
                closePanel({ panel: "mobile" })
            } else if (panelsCtx.mobilePanel) {
                closePanel({ panel: "mobile" }).then((res) => {
                    if (res) {
                        panelsCtx.mobilePanel = which
                        panelsCtx.leftPanel = null
                        panelsCtx.rightPanel = null
                    }
                })
            } else {
                panelsCtx.mobilePanel = which
                panelsCtx.leftPanel = null
                panelsCtx.rightPanel = null
            }
        } else if (isLeft) {
            if (panelsCtx.leftPanel === which) {
                closePanel({ panel: "left" })
            } else if (panelsCtx.leftPanel) {
                closePanel({ panel: "left" }).then((res) => {
                    if (res) {
                        panelsCtx.leftPanel = which
                    }
                })
            } else {
                panelsCtx.leftPanel = which
            }
        } else if (isRight) {
            if (panelsCtx.rightPanel === which) {
                closePanel({ panel: "right" })
            } else if (panelsCtx.rightPanel) {
                closePanel({ panel: "right" }).then((res) => {
                    if (res) {
                        panelsCtx.rightPanel = which
                    }
                })
            } else {
                panelsCtx.rightPanel = which
            }
        }
    }

    async function closePanel({ panel }: { panel: "left" | "right" | "mobile" }) {
        let res: boolean
        if (panel === "mobile") {
            res = await panelsCtx.onMobilePanelClose!()
            panelsCtx.mobilePanel = res ? null : panelsCtx.mobilePanel
        } else if (panel === "left") {
            res = await panelsCtx.onLeftPanelClose!()
            panelsCtx.leftPanel = res ? null : panelsCtx.leftPanel
        } else if (panel === "right") {
            res = await panelsCtx.onRightPanelClose!()
            panelsCtx.rightPanel = res ? null : panelsCtx.rightPanel
        }
        return res!
    }

    setContext("panels", panelsCtx as PanelsCtx)

    setContext("user", userCtx)
</script>

{#if !!userCtx.user}
    <div class="bg-surface-100-900 flex min-h-screen flex-col">
        <Header />
        <div class="mx-auto flex w-full flex-1 flex-col md:flex-row">
            <!-- Left Sidebar -->
            <aside
                class="sticky top-[2rem] z-30 hidden h-[calc(100vh-4.5rem)] w-full flex-[2_2_0%] md:block"
            >
                {#if panelsCtx.leftPanel}
                    <div
                        class="bg-surface-50-950 me-2 flex h-full flex-col rounded-r-lg"
                        in:fly={{ x: -100, duration: 200 }}
                        out:fly={{ x: -100, duration: 200 }}
                    >
                        <div class="flex items-center justify-between p-4">
                            <span class="text-foreground text-lg font-semibold capitalize"
                                >{panelsCtx.leftPanel}</span
                            >
                            <button class="btn-ghost" onclick={() => closePanel({ panel: "left" })}
                                ><Icons.X class="text-foreground h-5 w-5" /></button
                            >
                        </div>
                        <div class="flex-1 overflow-y-auto">
                            {#if panelsCtx.leftPanel === "sampling"}
                                <SamplingSidebar bind:onclose={panelsCtx.onLeftPanelClose} />
                            {:else if panelsCtx.leftPanel === "connections"}
                                <ConnectionsSidebar bind:onclose={panelsCtx.onLeftPanelClose} />
                            {:else if panelsCtx.leftPanel === "contexts"}
                                <ContextSidebar bind:onclose={panelsCtx.onLeftPanelClose} />
                            {:else if panelsCtx.leftPanel === "prompts"}
                                <PromptsSidebar bind:onclose={panelsCtx.onLeftPanelClose} />
                            {:else if panelsCtx.leftPanel === "settings"}
                                <SettingsSidebar bind:onclose={panelsCtx.onLeftPanelClose} />
                            {/if}
                        </div>
                    </div>
                {/if}
            </aside>
            <!-- Main Content -->
            <main
                class="bg-surface-50-950 flex min-h-[calc(100vh-4.5rem)] w-full flex-[4_4_0%] flex-col items-center justify-center rounded-t-lg px-2 md:px-0"
            >
                {@render children?.()}
            </main>
            <!-- Right Sidebar -->
            <aside
                class="sticky top-[2rem] z-30 hidden h-[calc(100vh-4.5rem)] w-full flex-[2_2_0%] md:block"
            >
                {#if panelsCtx.rightPanel}
                    <div
                        class="bg-surface-50-950 ms-2 flex h-full flex-col rounded-l-lg"
                        in:fly={{ x: 100, duration: 200 }}
                        out:fly={{ x: 100, duration: 200 }}
                    >
                        <div class="flex items-center justify-between p-4">
                            <span class="text-foreground text-lg font-semibold capitalize"
                                >{panelsCtx.rightPanel}</span
                            >
                            <button class="btn-ghost" onclick={() => closePanel({ panel: "right" })}
                                ><Icons.X class="text-foreground h-5 w-5" /></button
                            >
                        </div>
                        <div class="flex-1 overflow-y-auto">
                            {#if panelsCtx.rightPanel === "personas"}
                                <PersonasSidebar bind:onclose={panelsCtx.onRightPanelClose} />
                            {:else if panelsCtx.rightPanel === "characters"}
                                <CharactersSidebar bind:onclose={panelsCtx.onRightPanelClose} />
                            {:else if panelsCtx.rightPanel === "chats"}
                                <ChatsSidebar bind:onclose={panelsCtx.onRightPanelClose} />
                            {:else if panelsCtx.rightPanel === "lorebooks"}
                                <LorebooksSidebar bind:onclose={panelsCtx.onRightPanelClose} />
                            {:else if panelsCtx.rightPanel === "tags"}
                                <TagsSidebar bind:onclose={panelsCtx.onRightPanelClose} />
                            {/if}
                        </div>
                    </div>
                {/if}
            </aside>
        </div>
        {#if panelsCtx.mobilePanel}
            <div
                class="bg-surface-100-900 fixed inset-0 z-50 flex flex-col transition-all duration-200 ease-in-out md:hidden"
                in:fade
                out:fade
            >
                <div class="border-border flex items-center justify-between border-b p-4">
                    <span class="text-foreground text-lg font-semibold capitalize">
                        {panelsCtx.mobilePanel}</span
                    >
                    <button class="btn-ghost" onclick={() => closePanel({ panel: "mobile" })}>
                        <Icons.X class="text-foreground h-5 w-5" />
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto">
                    {#if panelsCtx.mobilePanel === "sampling"}
                        <SamplingConfigSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "connections"}
                        <ConnectionsSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "contexts"}
                        <ContextSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "lorebooks"}
                        <LorebooksSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "personas"}
                        <PersonasSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "characters"}
                        <CharactersSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "chats"}
                        <ChatsSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "prompts"}
                        <PromptsSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "tags"}
                        <TagsSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {:else if panelsCtx.mobilePanel === "settings"}
                        <SettingsSidebar bind:onclose={panelsCtx.onMobilePanelClose} />
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{/if}

<Toaster {toaster}></Toaster>

<style>
</style>
