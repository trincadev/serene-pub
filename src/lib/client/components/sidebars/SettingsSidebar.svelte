<script lang="ts">
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { getContext, onMount } from "svelte"
	import { Theme } from "$lib/client/consts/Theme"
	import { appVersion, appVersionDisplay } from "$lib/shared/constants/version"
	import * as Icons from "@lucide/svelte"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}
	let { onclose = $bindable() }: Props = $props()

	let isDarkMode = $state(false)
	let selectedTheme: string = $state("")
	let themeCtx: ThemeCtx = $state(getContext("themeCtx"))

	$effect(() => {
		isDarkMode = themeCtx.mode === "dark"
	})

	$effect(() => {
		selectedTheme = themeCtx.theme
	})

	const onDarkModeChanged = (event: { checked: boolean }) => {
		themeCtx.mode = event.checked ? "dark" : "light"
	}

	const onThemeChanged = (event: Event) => {
		const target = event.target as HTMLSelectElement
		themeCtx.theme = target.value
	}

	onMount(() => {
		onclose = async () => {
			return true
		}
	})
</script>

<div class="p-4">
	<div class="flex flex-col gap-4">
		<div>
			<label for="theme" class="font-semibold">Theme</label>
			<select
				class="select"
				name="theme"
				value={selectedTheme}
				onchange={onThemeChanged}
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
			></Switch>
			<label for="dark-mode" class="font-semibold">Dark Mode</label>
		</div>
	</div>

	<div class="about-section mt-6 rounded-lg bg-surface-500 p-4 shadow-md flex flex-col gap-2 items-start">
		<div class="flex items-center gap-2 mb-1">
			<Icons.Info size={20} class="text-primary-500" />
			<span class="text-lg font-bold tracking-wide">Serene Pub</span>
			<span class="ml-2 px-2 py-0.5 rounded bg-primary-100-700 text-primary-700 dark:text-primary-200 text-xs font-mono">
				{appVersionDisplay}
			</span>
		</div>
		<div class="text-xs text-surface-500 mb-2">
			Build: <span class="font-mono">{appVersion}</span>
		</div>
		<div class="flex flex-wrap gap-3 items-center">
			<a
				href="https://github.com/doolijb/serene-pub"
				target="_blank"
				rel="noopener noreferrer"
				class="btn flex items-center gap-1 preset-filled-primary-600"
			>
				<Icons.GitBranch size={16} />
				<span>Repository</span>
			</a>
			<a
				href="https://github.com/doolijb/serene-pub/issues"
				target="_blank"
				rel="noopener noreferrer"
				class="btn flex items-center gap-1 preset-filled-error-600"
			>
				<Icons.AlertCircle size={16} />
				<span>Issues</span>
			</a>
			<a
				href="https://github.com/doolijb/serene-pub/discussions"
				target="_blank"
				rel="noopener noreferrer"
				class="btn flex items-center gap-1 preset-filled-secondary-600"
			>
				<Icons.MessageCircle size={16} />
				<span>Discussions</span>
			</a>
		</div>
		<div class="text-xs text-muted-foreground mt-2">
			&copy; {new Date().getFullYear()} <a href="https://github.com/doolijb" target="_blank" rel="noopener noreferrer" class="hover:underline text-primary-500">doolijb</a>. All rights reserved.
		</div>
	</div>
</div>
