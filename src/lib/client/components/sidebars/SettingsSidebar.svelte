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
		// TODO use setTheme socket call
	}

	const onThemeChanged = (event: Event) => {
		const target = event.target as HTMLSelectElement
		themeCtx.theme = target.value
		// TODO use setTheme socket call
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
					>
						<Icons.Download size={16} />
						Download here
					</a>
				</div>
			</div>
		{/if}

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
			>
				<Icons.GitBranch size={16} />
				<span>Repository</span>
			</a>
			<a
				href="https://github.com/doolijb/serene-pub/issues"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-error-500"
			>
				<Icons.AlertCircle size={16} />
				<span>Issues</span>
			</a>
			<a
				href="https://github.com/doolijb/serene-pub/discussions"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-secondary-500"
			>
				<Icons.MessageCircle size={16} />
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
