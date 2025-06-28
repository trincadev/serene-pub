<script lang="ts">
	import type { Snippet } from "svelte"

	interface Props {
		id?: number
		content: Snippet
		extraContent?: Snippet
		controls?: Snippet
		onclick: (e: MouseEvent) => void
		contentTitle: string
	}

	let { id, content, extraContent, controls, onclick, contentTitle }: Props =
		$props()
</script>

<div
	class="card preset-tonal hover:preset-filled-surface-300-700 relative flex w-full gap-2 overflow-hidden rounded-lg py-2 pr-3 pl-2"
>
	<div class="relative flex gap-2 flex-1">
		{#if id !== undefined}
			<button {onclick} class="flex flex-1 gap-2" title={contentTitle}>
				<span
					class="text-muted-foreground my-auto h-fit w-[2em] text-xs"
				>
					{id}
				</span>
			</button>
		{/if}
		<div class="flex flex-col w-full">
			<div class="flex">
				<button
					{onclick}
					class="flex flex-1 gap-2"
					title={contentTitle}
				>
					{@render content()}
				</button>
			</div>
			{@render extraContent?.()}
		</div>
	</div>
	{@render controls?.()}
</div>
