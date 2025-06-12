<script lang="ts">
	import { browser } from "$app/environment"
	import Layout from "$lib/client/components/Layout.svelte"
	import { loadSocketsClient } from "$lib/client/sockets/loadSockets.svelte"

	interface Props {
		children?: import("svelte").Snippet
	}

	let { children }: Props = $props()

	let socketsInitialized = $state(false)

	if (browser) {
		loadSocketsClient().then(() => {
			socketsInitialized = true
		})
	}
</script>

{#if socketsInitialized}
	<Layout>
		{@render children?.()}
	</Layout>
{/if}
