<script lang="ts">
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { getContext, onMount } from "svelte"
	import { Theme } from "$lib/client/consts/Theme"

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
        
        <div><label for="theme" class="font-semibold">Theme</label>
		<select class="select" name="theme" value={selectedTheme} onchange={onThemeChanged}>
			{#each Theme.options as [key, label]}
				<option value={key}>{label}</option>
			{/each}
		</select>
        </div>

        <div class="flex gap-2">
		<Switch name="dark-mode" checked={isDarkMode} onCheckedChange={onDarkModeChanged}
		></Switch>
        <label for="dark-mode" class="font-semibold">Dark Mode</label>
        </div>
	</div>
</div>
