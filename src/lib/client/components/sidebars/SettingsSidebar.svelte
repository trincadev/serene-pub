<script lang="ts">
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { getContext, onMount } from "svelte"
	import { Theme } from "$lib/client/consts/Theme"
	import {
		appVersion,
		appVersionDisplay
	} from "$lib/shared/constants/version"
	import * as Icons from "@lucide/svelte"
	import { page } from "$app/state"
	import * as skio from "sveltekit-io"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}
	let { onclose = $bindable() }: Props = $props()

	const socket = skio.get()

	let isDarkMode = $state(false)
	let selectedTheme: string = $state("")
	let themeCtx: ThemeCtx = $state(getContext("themeCtx"))
	let systemSettingsCtx: SystemSettingsCtx = $state(getContext("systemSettingsCtx"))

	$effect(() => {
		const _s = {...$state.snapshot(systemSettingsCtx)}
		console.log("SettingsSidebar systemSettingsCtx", $state.snapshot(systemSettingsCtx))
	})

	$effect(() => {
		isDarkMode = themeCtx.mode === "dark"
	})

	$effect(() => {
		selectedTheme = themeCtx.theme
	})

	const onDarkModeChanged = (event: { checked: boolean }) => {
		themeCtx.mode = event.checked ? "dark" : "light"
		// TODO use setTheme socket call
	}

	const onThemeChanged = (event: Event) => {
		const target = event.target as HTMLSelectElement
		themeCtx.theme = target.value
		// TODO use setTheme socket call
	}

	async function onOllamaManagerEnabledClick(event: { checked: boolean }) {
		const res: Sockets.UpdateOllamaManagerEnabled.Call = {
			enabled: event.checked
		}
		socket.emit("updateOllamaManagerEnabled", res)
	}

	async function onShowAllCharacterFieldsClick(event: { checked: boolean }) {
		const res: Sockets.UpdateShowAllCharacterFields.Call = {
			enabled: event.checked
		}
		socket.emit("updateShowAllCharacterFields", res)
	}

	async function onEasyCharacterCreationClick(event: { checked: boolean }) {
		const res: Sockets.UpdateEasyCharacterCreation.Call = {
			enabled: event.checked
		}
		socket.emit("updateEasyCharacterCreation", res)
	}

	async function onEasyPersonaCreationClick(event: { checked: boolean }) {
		const res: Sockets.UpdateEasyPersonaCreation.Call = {
			enabled: event.checked
		}
		socket.emit("updateEasyPersonaCreation", res)
	}

	onMount(() => {
		onclose = async () => {
			return true
		}
	})
</script>

<div class="p-4">
	<div class="flex flex-col gap-4">
		{#if page.data?.isNewerReleaseAvailable}
			<div
				class="bg-surface-200-800 mb-2 flex w-full flex-col items-center justify-between gap-4 rounded p-3 text-center"
			>
				<p>A newer version of Serene Pub is available!</p>
				<div class="mt-2">
					<a
						href="https://github.com/doolijb/serene-pub/releases"
						target="_blank"
						rel="noopener"
						class="btn preset-filled-success-500"
						aria-label="Download newer version of Serene Pub"
					>
						<Icons.Download size={16} aria-hidden="true" />
						Download here
					</a>
				</div>
			</div>
		{/if}

		<div>
			<label for="theme" class="font-semibold">Theme</label>
			<select
				id="theme" 
				class="select"
				name="theme"
				value={selectedTheme}
				onchange={onThemeChanged}
				aria-label="Select application theme"
			>
				{#each Theme.options as [key, label]}
					<option value={key}>{label}</option>
				{/each}
			</select>
		</div>

		<div class="flex gap-2">
			<Switch
				name="dark-mode"
				checked={isDarkMode}
				onCheckedChange={onDarkModeChanged}
				aria-label="Toggle dark mode"
			></Switch>
			<label for="dark-mode" class="font-semibold">Dark Mode</label>
		</div>
		<div class="flex gap-2">
			<Switch
				name="ollama-manager"
				checked={systemSettingsCtx.settings.ollamaManagerEnabled}
				onCheckedChange={onOllamaManagerEnabledClick}
				aria-label="Toggle Ollama Manager"
			></Switch>
			<label for="ollama-manager" class="font-semibold">Enable Ollama Manager</label>
		</div>
		<div class="flex gap-2">
			<Switch
				name="show-all-character-fields"
				checked={systemSettingsCtx.settings.showAllCharacterFields}
				onCheckedChange={onShowAllCharacterFieldsClick}
				aria-label="Toggle Show All Character Fields"
			></Switch>
			<label for="show-all-character-fields" class="font-semibold">Show All Character Fields</label>
		</div>
		<div class="flex gap-2">
			<Switch
				name="easy-character-creation"
				checked={systemSettingsCtx.settings.enableEasyCharacterCreation}
				onCheckedChange={onEasyCharacterCreationClick}
				aria-label="Toggle Easy Character Creation"
			></Switch>
			<label for="easy-character-creation" class="font-semibold">Easy Character Creation</label>
		</div>
		<div class="flex gap-2">
			<Switch
				name="easy-persona-creation"
				checked={systemSettingsCtx.settings.enableEasyPersonaCreation}
				onCheckedChange={onEasyPersonaCreationClick}
				aria-label="Toggle Easy Persona Creation"
			></Switch>
			<label for="easy-persona-creation" class="font-semibold">Easy Persona Creation</label>
		</div>
	</div>

	<div
		class="about-section bg-surface-500/25 mt-6 flex flex-col items-start gap-2 rounded-lg p-4 shadow-md"
	>
		<div class="mb-1 flex items-center gap-2">
			<Icons.Info size={20} class="text-primary-500" />
			<span class="text-lg font-bold tracking-wide">Serene Pub</span>
			<span
				class="bg-primary-200-800 text-primary-700 dark:text-primary-200 ml-2 rounded px-2 py-0.5 font-mono text-xs"
			>
				{appVersionDisplay}
			</span>
		</div>
		<div class="text-surface-500 mb-2 text-xs">
			Build: <span class="font-mono">{appVersion}</span>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<a
				href="https://github.com/doolijb/serene-pub"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-primary-500 gap-1"
				aria-label="Visit Serene Pub GitHub repository"
			>
				<Icons.GitBranch size={16} aria-hidden="true" />
				<span>Repository</span>
			</a>
			<a
				href="https://github.com/doolijb/serene-pub/wiki"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-surface-500"
				aria-label="Visit Serene Pub wiki documentation"
			>
				<Icons.BookOpen size={16} aria-hidden="true" />
				<span>Wiki</span>
			</a>
			<a
				href="https://discord.gg/3kUx3MDcSa"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-tertiary-500"
				aria-label="Join Serene Pub Discord community"
			>
				<Icons.MessageSquare size={16} aria-hidden="true" />
				<span>Discord</span>
			</a>
			<a
				href="https://github.com/doolijb/serene-pub/issues"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-error-500"
				aria-label="Report issues on GitHub"
			>
				<Icons.AlertCircle size={16} aria-hidden="true" />
				<span>Issues</span>
			</a>
			<a
				href="https://github.com/doolijb/serene-pub/discussions"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-secondary-500"
				aria-label="Join discussions on GitHub"
			>
				<Icons.MessageCircle size={16} aria-hidden="true" />
				<span>Discussions</span>
			</a>
		</div>
		<div class="text-muted-foreground mt-2 text-xs">
			&copy; {new Date().getFullYear()} Serene Pub (
			<a
				href="https://github.com/doolijb"
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary-500 hover:underline"
			>
				Jody Doolittle
			</a>
			).
		</div>
		<div class="text-muted-foreground mt-2 text-xs">
			Distributed under the AGPL-3.0 License.
		</div>
	</div>
</div>
