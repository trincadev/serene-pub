<script lang="ts">
	import Header from "./Header.svelte"
	import "../../../app.css"
	import * as Icons from "@lucide/svelte"
	import { fly, fade } from "svelte/transition"
	import { onMount, setContext } from "svelte"
	import SamplingSidebar from "./sidebars/SamplingSidebar.svelte"
	import ConnectionsSidebar from "./sidebars/ConnectionsSidebar.svelte"
	import ContextSidebar from "./sidebars/ContextSidebar.svelte"
	import LorebooksSidebar from "./sidebars/LorebooksSidebar.svelte"
	import PersonasSidebar from "./sidebars/PersonasSidebar.svelte"
	import CharactersSidebar from "./sidebars/CharactersSidebar.svelte"
	import ChatsSidebar from "./sidebars/ChatsSidebar.svelte"
	import PromptsSidebar from "./sidebars/PromptsSidebar.svelte"
	import TagsSidebar from "./sidebars/TagsSidebar.svelte"
	import skio from "sveltekit-io"
	import { Toaster } from "@skeletonlabs/skeleton-svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import SettingsSidebar from "$lib/client/components/sidebars/SettingsSidebar.svelte"
	import type { Snippet } from "svelte"
	import { Theme } from "$lib/client/consts/Theme"

	interface Props {
		children?: Snippet
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
			sampling: {
				icon: Icons.SlidersHorizontal,
				title: "SamplingConfig"
			},
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
		},
		digest: {}
	})
	let themeCtx: ThemeCtx = $state({
		mode: localStorage.getItem("mode") as "light" | "dark" || "dark",
		theme: localStorage.getItem("theme") || Theme.CERBERUS
	})

	function openPanel({key, toggle = true}: { key: string; toggle?: boolean }): void {
		// Determine which nav the key belongs to
		const isLeft = Object.prototype.hasOwnProperty.call(
			panelsCtx.leftNav,
			key
		)
		const isRight = Object.prototype.hasOwnProperty.call(
			panelsCtx.rightNav,
			key
		)
		const isMobile = window.innerWidth < 768
		if (isMobile) {
			if (panelsCtx.mobilePanel === key) {
				if (toggle) {
					closePanel({ panel: "mobile" })
				}
				// else do nothing (leave open)
			} else if (panelsCtx.mobilePanel) {
				closePanel({ panel: "mobile" }).then((res) => {
					if (res) {
						panelsCtx.mobilePanel = key
						panelsCtx.leftPanel = null
						panelsCtx.rightPanel = null
					}
				})
			} else {
				panelsCtx.mobilePanel = key
				panelsCtx.leftPanel = null
				panelsCtx.rightPanel = null
			}
		} else if (isLeft) {
			if (panelsCtx.leftPanel === key) {
				if (toggle) {
					closePanel({ panel: "left" })
				}
				// else do nothing (leave open)
			} else if (panelsCtx.leftPanel) {
				closePanel({ panel: "left" }).then((res) => {
					if (res) {
						panelsCtx.leftPanel = key
					}
				})
			} else {
				panelsCtx.leftPanel = key
			}
		} else if (isRight) {
			if (panelsCtx.rightPanel === key) {
				if (toggle) {
					closePanel({ panel: "right" })
				}
				// else do nothing (leave open)
			} else if (panelsCtx.rightPanel) {
				closePanel({ panel: "right" }).then((res) => {
					if (res) {
						panelsCtx.rightPanel = key
					}
				})
			} else {
				panelsCtx.rightPanel = key
			}
		}
	}

	async function closePanel({
		panel
	}: {
		panel: "left" | "right" | "mobile"
	}) {
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

	function handleMobilePanelClick(key: string) {
		panelsCtx.openPanel({key})
		panelsCtx.isMobileMenuOpen = false
	}

	$effect(() => {
		const mode = themeCtx.mode
		localStorage.setItem("mode", mode)
		document.documentElement.setAttribute("data-mode", mode)
	})

	$effect(() => {
		const theme = themeCtx.theme
		localStorage.setItem("theme", theme)
		document.documentElement.setAttribute("data-theme", theme)
	})

	setContext("panelsCtx", panelsCtx as PanelsCtx)
	setContext("userCtx", userCtx)
	setContext("themeCtx", themeCtx)

	onMount(() => {
		socket.on("user", (message) => {
			userCtx.user = message.user
		})

		socket.on("error", (message: Sockets.Error.Response) => {
			toaster.error({ title: "Error", description: message.error })
		})

		socket.emit("user", {})
	})
</script>

{#if !!userCtx.user}
	<div
		class="bg-surface-100-900 relative flex min-h-screen w-[100%] max-w-[100%] flex-col justify-between"
	>
		<Header />
		<div
			class="relative mx-auto flex w-full flex-1 flex-col gap-1 gap-2 lg:flex-row"
		>
			<!-- Left Sidebar -->
			<aside class="desktop-sidebar">
				{#if panelsCtx.leftPanel}
					<div
						class="bg-surface-50-950 me-2 flex h-full w-full flex-col rounded-r-lg"
						in:fly={{ x: -100, duration: 200 }}
						out:fly={{ x: -100, duration: 200 }}
					>
						<div class="flex items-center justify-between p-4">
							<span
								class="text-foreground text-lg font-semibold capitalize"
							>
								{panelsCtx.leftPanel}
							</span>
							<button
								class="btn-ghost"
								onclick={() => closePanel({ panel: "left" })}
							>
								<Icons.X class="text-foreground h-5 w-5" />
							</button>
						</div>
						<div class="flex-1 overflow-y-auto">
							{#if panelsCtx.leftPanel === "sampling"}
								<SamplingSidebar
									bind:onclose={panelsCtx.onLeftPanelClose}
								/>
							{:else if panelsCtx.leftPanel === "connections"}
								<ConnectionsSidebar
									bind:onclose={panelsCtx.onLeftPanelClose}
								/>
							{:else if panelsCtx.leftPanel === "contexts"}
								<ContextSidebar
									bind:onclose={panelsCtx.onLeftPanelClose}
								/>
							{:else if panelsCtx.leftPanel === "prompts"}
								<PromptsSidebar
									bind:onclose={panelsCtx.onLeftPanelClose}
								/>
							{:else if panelsCtx.leftPanel === "settings"}
								<SettingsSidebar
									bind:onclose={panelsCtx.onLeftPanelClose}
								/>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
			<!-- Main Content -->
			<main class="bg-surface-50-950">
				{@render children?.()}
			</main>
			<!-- Right Sidebar -->
			<aside class="desktop-sidebar">
				{#if panelsCtx.rightPanel}
					<div
						class="bg-surface-50-950 flex h-full w-full flex-col rounded-l-lg"
						in:fly={{ x: 100, duration: 200 }}
						out:fly={{ x: 100, duration: 200 }}
					>
						<div class="flex items-center justify-between p-4">
							<span
								class="text-foreground text-lg font-semibold capitalize"
							>
								{panelsCtx.rightPanel}
							</span>
							<button
								class="btn-ghost"
								onclick={() => closePanel({ panel: "right" })}
							>
								<Icons.X class="text-foreground h-5 w-5" />
							</button>
						</div>
						<div class="flex-1 overflow-y-auto">
							{#if panelsCtx.rightPanel === "personas"}
								<PersonasSidebar
									bind:onclose={panelsCtx.onRightPanelClose}
								/>
							{:else if panelsCtx.rightPanel === "characters"}
								<CharactersSidebar
									bind:onclose={panelsCtx.onRightPanelClose}
								/>
							{:else if panelsCtx.rightPanel === "chats"}
								<ChatsSidebar
									bind:onclose={panelsCtx.onRightPanelClose}
								/>
							{:else if panelsCtx.rightPanel === "lorebooks"}
								<LorebooksSidebar
									bind:onclose={panelsCtx.onRightPanelClose}
								/>
							{:else if panelsCtx.rightPanel === "tags"}
								<TagsSidebar
									bind:onclose={panelsCtx.onRightPanelClose}
								/>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
		</div>
		{#if panelsCtx.mobilePanel}
			<div
				class="bg-surface-100-900 fixed inset-0 z-[51] flex flex-col lg:hidden"
			>
				<div
					class="border-border flex items-center justify-between border-b p-4"
				>
					<span
						class="text-foreground text-lg font-semibold capitalize"
					>
						{panelsCtx.mobilePanel}
					</span>
					<button
						class="btn-ghost"
						onclick={() => closePanel({ panel: "mobile" })}
					>
						<Icons.X class="text-foreground h-5 w-5" />
					</button>
				</div>
				<div class="flex-1 overflow-y-auto">
					{#if panelsCtx.mobilePanel === "sampling"}
						<SamplingSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "connections"}
						<ConnectionsSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "contexts"}
						<ContextSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "lorebooks"}
						<LorebooksSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "personas"}
						<PersonasSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "characters"}
						<CharactersSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "chats"}
						<ChatsSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "prompts"}
						<PromptsSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "tags"}
						<TagsSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{:else if panelsCtx.mobilePanel === "settings"}
						<SettingsSidebar
							bind:onclose={panelsCtx.onMobilePanelClose}
						/>
					{/if}
				</div>
			</div>
		{/if}
		<!-- Mobile menu -->
		{#if panelsCtx.isMobileMenuOpen}
			<!-- Backdrop -->
			<div class="fixed inset-0 z-[40] bg-black/40"></div>
			<div
				class="bg-surface-100-900/95 fixed inset-0 z-[40] flex flex-col overflow-y-auto px-2 lg:hidden"
			>
				<div
					class="border-border flex items-center justify-between border-b p-4"
				>
					<span
						class="text-foreground funnel-display text-xl font-bold tracking-tight whitespace-nowrap"
					>
						Serene Pub
					</span>
					<button
						type="button"
						onclick={(e) => {
							console.log("Click!")
							e.stopPropagation()
							panelsCtx.isMobileMenuOpen = false
						}}
					>
						<Icons.X class="text-foreground h-6 w-6" />
					</button>
				</div>
				<div class="flex flex-col gap-4 p-4 text-2xl">
					{#each Object.entries( { ...panelsCtx.rightNav, ...panelsCtx.leftNav } ) as [key, item]}
						<button
							class="btn-ghost flex items-center gap-2"
							title={item.title}
							onclick={() => handleMobilePanelClick(key)}
						>
							<item.icon class="text-foreground h-5 w-5" />
							<span>{item.title}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<Toaster {toaster}></Toaster>

<style lang="postcss">
	@reference "tailwindcss";

	/* w-[100%] lg:min-w-[50%] lg:w-[50%] */

	main {
		@apply relative m-0 min-h-[calc(100vh-4.5rem)] basis-1/2 flex-col rounded-t-lg p-0 px-2 lg:max-w-[50%];
	}

	/* w-[25%] max-w-[25%] */

	.desktop-sidebar {
		@apply sticky top-[2rem] z-30 hidden h-[calc(100vh-4.5rem)] basis-1/4 overflow-x-hidden lg:block;
	}
</style>
