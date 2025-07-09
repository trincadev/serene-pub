<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import { getContext, onMount, onDestroy, tick } from "svelte"
	import { Tabs } from "@skeletonlabs/skeleton-svelte"
	import type { ValueChangeDetails } from "@zag-js/tabs"
	import OllamaInstalledTab from "../ollamaManager/OllamaInstalledTab.svelte"
	import OllamaAvailableTab from "../ollamaManager/OllamaAvailableTab.svelte"
	import OllamaSettingsTab from "../ollamaManager/OllamaSettingsTab.svelte"
	import * as skio from "sveltekit-io"
	import { toaster } from "$lib/client/utils/toaster"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}

	let { onclose = $bindable() }: Props = $props()

	const socket = skio.get()

	// State
	let activeTab = $state<"installed" | "available" | "settings">("installed")
	let themeCtx: ThemeCtx = $state(getContext("themeCtx"))
	let isConnected = $state(false)
	let systemSettingsCtx: SystemSettingsCtx = $state(
		getContext("systemSettingsCtx")
	)
	let isSavingBaseUrl = $state(false)
	let baseUrlField = $state("")

	// Handle tab switching
	function handleTabChange(e: ValueChangeDetails): void {
		activeTab = e.value as "installed" | "available" | "settings"
	}

	// Check connection to Ollama
	function checkConnection() {
		socket.emit("ollamaVersion", {})
	}

	// Save base URL
	function handleSaveBaseUrl() {
		if (!systemSettingsCtx.settings.ollamaManagerBaseUrl.trim()) {
			toaster.error({ title: "Base URL cannot be empty" })
			return
		}

		isSavingBaseUrl = true
		socket.emit("ollamaSetBaseUrl", {
			baseUrl: baseUrlField.trim()
		})
	}

	$effect(() => {
		baseUrlField = systemSettingsCtx.settings.ollamaManagerBaseUrl
	})

	onMount(() => {
		socket.on(
			"ollamaVersion",
			(message: Sockets.OllamaVersion.Response) => {
				// We only want to set isConnected if it hasn't been set yet
				// We don't want to display the initial setup screen if the user
				// is working in the settings tab, etc.
				if (!isConnected) {
					isConnected = !!message.version
				}
			}
		)

		socket.on(
			"ollamaSetBaseUrl",
			(message: Sockets.OllamaSetBaseUrl.Response) => {
				isSavingBaseUrl = false
				if (message.success) {
					toaster.success({
						title: "Ollama URL updated successfully"
					})
					// Try to reconnect after URL change
					checkConnection()
				} else {
					toaster.error({ title: "Failed to update Ollama URL" })
				}
			}
		)

		// Check initial connection
		checkConnection()
	})

	onDestroy(() => {
		socket.off("ollamaVersion")
		socket.off("ollamaSetBaseUrl")
	})

	// Sidebar close handler
	onclose = async () => {
		return true // Allow closing
	}
</script>

<div class="flex h-full flex-col">
	<!-- Check if Ollama Manager is enabled -->
	{#if !systemSettingsCtx.settings.ollamaManagerEnabled}
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="text-center">
				<Icons.AlertCircle class="mx-auto mb-4 h-12 w-12 text-warning-500" />
				<h3 class="mb-2 text-lg font-semibold text-foreground">
					Ollama Manager Disabled
				</h3>
				<p class="text-sm text-muted-foreground">
					Enable Ollama Manager in Settings to use this feature.
				</p>
			</div>
		</div>
	{:else if !isConnected}
		<!-- Connection setup -->
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="w-full max-w-md space-y-4">
				<div class="text-center">
					<Icons.Server class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 text-lg font-semibold text-foreground">
						Connect to Ollama
					</h3>
					<p class="mb-4 text-sm text-muted-foreground">
						Enter your Ollama server URL to get started.
					</p>
				</div>

				<div class="space-y-3">
					<div>
						<label class="block text-sm font-medium text-foreground mb-1" for="ollamaBaseUrl">
							Ollama Base URL
						</label>
						<input
							id="ollamaBaseUrl"
							type="text"
							bind:value={baseUrlField}
							placeholder="http://localhost:11434/"
							class="input w-full"
						/>
					</div>

					<div class="flex gap-2">
						<button
							class="btn btn-primary flex-1"
							onclick={handleSaveBaseUrl}
							disabled={isSavingBaseUrl}
						>
							{#if isSavingBaseUrl}
								<Icons.Loader2 class="h-4 w-4 animate-spin" />
								Saving...
							{:else}
								<Icons.Save class="h-4 w-4" />
								Save & Connect
							{/if}
						</button>
						<button
							class="btn btn-secondary"
							onclick={checkConnection}
						>
							<Icons.RefreshCw class="h-4 w-4" />
							Test
						</button>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main Ollama Manager Content -->
		<div class="flex-1 overflow-y-auto">
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				{#snippet list()}
					<Tabs.Control value="installed">
						<Icons.Package size={20} class="inline" />
						{#if activeTab === "installed"}
							Installed
						{/if}
					</Tabs.Control>
					<Tabs.Control value="available">
						<Icons.Download size={20} class="inline" />
						{#if activeTab === "available"}
							Available
						{/if}
					</Tabs.Control>
					<Tabs.Control value="settings">
						<Icons.Settings size={20} class="inline" />
						{#if activeTab === "settings"}
							Settings
						{/if}
					</Tabs.Control>
				{/snippet}
				{#snippet content()}
					<Tabs.Panel value="installed">
						{#if activeTab === "installed"}
							<OllamaInstalledTab />
						{/if}
					</Tabs.Panel>
					<Tabs.Panel value="available">
						{#if activeTab === "available"}
							<OllamaAvailableTab />
						{/if}
					</Tabs.Panel>
					<Tabs.Panel value="settings">
						{#if activeTab === "settings"}
							<OllamaSettingsTab />
						{/if}
					</Tabs.Panel>
				{/snippet}
			</Tabs>
		</div>
	{/if}
</div>
