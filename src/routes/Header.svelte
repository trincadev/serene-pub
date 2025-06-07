<script lang="ts">
	import * as Icons from '@lucide/svelte'
    import { getContext } from 'svelte'
	
	let panelsCtx: PanelsCtx = getContext('panels')

</script>

<header class="sticky top-0 z-30 w-full">
	<div class="w-full md:w-[50%] mx-auto flex px-4 py-2 relative justify-between bg-surface-100-900 bg-opacity-25 backdrop-blur shadow-lg">
		<!-- Mobile hamburger -->
		<div class="flex md:hidden items-center gap-2">
			<button onclick={() => (panelsCtx.isMobileMenuOpen = !panelsCtx.isMobileMenuOpen)} aria-label="Open menu">
				<Icons.Menu class="w-6 h-6 text-foreground" />
			</button>
		</div>

		<!-- Desktop left nav -->
		<div class="hidden md:flex flex-1 justify-start gap-2">
			{#each panelsCtx.leftNav as item}
				<button class="btn-ghost" title={item.title} onclick={() => panelsCtx.openPanel({panel: 'left', which: item.key})}>
					<svelte:component this={item.icon} class="w-5 h-5 text-foreground" />
				</button>
			{/each}
		</div>

		<!-- Title (centered absolutely for desktop) -->
		<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 flex-0 flex justify-center w-full md:w-auto">
			<a class="font-bold text-xl tracking-tight text-foreground whitespace-nowrap funnel-display" href="/">Serene Pub</a>
		</div>

		<!-- Desktop right nav -->
		<div class="hidden md:flex flex-1 justify-end gap-2">
			{#each panelsCtx.rightNav as item}
				<button class="btn-ghost" title={item.title} onclick={() => panelsCtx.openPanel({panel: 'right', which: item.key})}>
					<svelte:component this={item.icon} class="w-5 h-5 text-foreground" />
				</button>
			{/each}
		</div>
	</div>

	<!-- Mobile menu -->
	{#if panelsCtx.isMobileMenuOpen}
		<div class="md:hidden fixed inset-0 z-50 bg-surface-100-900/95 flex flex-col">
			<div class="flex justify-between items-center p-4 border-b border-border">
				<a class="font-bold text-xl tracking-tight text-foreground whitespace-nowrap funnel-display" href="/">Serene Pub</a>
				<button onclick={() => (panelsCtx.isMobileMenuOpen = false)}>
					<Icons.X class="w-6 h-6 text-foreground" />
				</button>
			</div>
			<div class="flex flex-col gap-2 p-4">
				{#each panelsCtx.leftNav as item}
					<button
						class="btn-ghost flex items-center gap-2"
						title={item.title}
						onclick={() => {
							panelsCtx.openPanel({panel: 'left', which: item.key})
							panelsCtx.isMobileMenuOpen = false
						}}
					>
						<svelte:component this={item.icon} class="w-5 h-5 text-foreground" />
						<span>{item.title}</span>
					</button>
				{/each}
				{#each panelsCtx.rightNav as item}
					<button
						class="btn-ghost flex items-center gap-2"
						title={item.title}
						onclick={() => {
							panelsCtx.openPanel({panel: 'right', which: item.key})
							panelsCtx.isMobileMenuOpen = false
						}}
					>
						<svelte:component this={item.icon} class="w-5 h-5 text-foreground" />
						<span>{item.title}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
	}
</style>
