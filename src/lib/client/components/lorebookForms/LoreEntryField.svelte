<script lang="ts">
	import { Editor } from "@tiptap/core"
	import StarterKit from "@tiptap/starter-kit"
	import { onMount } from "svelte"
	import CharacterTag from "../../utils/tiptapCharacterTag"
	import * as Icons from "@lucide/svelte"
	import { Popover, Tooltip } from "@skeletonlabs/skeleton-svelte"
	import { char } from "drizzle-orm/mysql-core"
    import Placeholder from '@tiptap/extension-placeholder'
	import LegacyTag from "$lib/client/utils/tiptapLegacyTag"

	interface Props {
		content: string
		lorebookBindingList: Sockets.LorebookBindingList.Response["lorebookBindingList"]
	}

	let { content = $bindable(), lorebookBindingList = $bindable() }: Props =
		$props()

	let editor: Editor
	let editorEl: HTMLDivElement
	let isBold = $state(false)
	let canUndo = $state(false)
	let canRedo = $state(false)
	let addBindingOpenState = $state(false)

	function getLabel(id: string) {
		const binding = lorebookBindingList.find((b) => b.id == +id)
		return (
			binding?.character?.nickname ||
			binding?.character?.name ||
			binding?.persona?.name ||
			`{char:${id}}`
		)
	}

	function getCharType(id: string): "character" | "persona" | "unknown" {
		const binding = lorebookBindingList.find((b) => b.id == +id)
		return binding?.characterId
			? "character"
			: binding?.personaId
				? "persona"
				: "unknown"
	}

	function updateToolbarStates() {
		if (!editor) return
		isBold = editor.isActive("bold")
		canUndo = editor.can().undo()
		canRedo = editor.can().redo()
	}

	onMount(() => {
		editor = new Editor({
			element: editorEl,
			content,
			extensions: [
				StarterKit,
				CharacterTag.configure({ getLabel, getCharType }),
                LegacyTag.configure({}),
                Placeholder.configure({
                    placeholder: ({ node }) => "A subterranean metropolis carved into the bones of a long-dead titan..."
                }),
			],
			onUpdate: ({ editor }) => {
				content = editor.getText()
				updateToolbarStates()
			}
		})
		editor.on("selectionUpdate", updateToolbarStates)
		updateToolbarStates()
	})
</script>

<div
	class=""
>
	<div class="tiptap-toolbar mb-1">
		<Popover
			open={addBindingOpenState}
			onOpenChange={(e) => (addBindingOpenState = e.open)}
			positioning={{ placement: "bottom" }}
			triggerBase="underline"
			contentBase="card preset-filled-surface-100-900 shadow-xl p-4"
			zIndex="1000"
		>
			{#snippet trigger()}
				<button
					class="btn btn-sm preset-filled-surface-500"
					title="Insert Character Tag"
				>
					<Icons.UserPlus size={16} />
				</button>
			{/snippet}
			{#snippet content()}
				<div class="flex flex-col gap-2">
					<div class="mb-2 text-sm font-semibold">
						Insert Character Tag
					</div>
					{#each lorebookBindingList as binding}
						{@const char = binding.character || binding.persona}
						<button
							class="btn"
							class:preset-filled-primary-500={!!binding.characterId}
							class:preset-filled-surface-500={!!binding.personaId}
							class:preset-filled-warning-500={!char}
							onclick={() => {
								editor.commands.insertCharacterTag(binding.id)
								addBindingOpenState = false
							}}
							title={char
								? `${char.name} (${binding.id})`
								: `char:${binding.id}`}
						>
							{char
								? char.nickname || char.name
								: `char:${binding.id}`}
						</button>
					{/each}
				</div>
			{/snippet}
		</Popover>
		<button
			class="btn btn-sm preset-filled-surface-500"
			title="Undo"
			onclick={() => editor && editor.chain().focus().undo().run()}
			disabled={!canUndo}
		>
			<Icons.Undo size={16} />
		</button>
		<button
			class="btn btn-sm preset-filled-surface-500"
			title="Redo"
			onclick={() => editor && editor.chain().focus().redo().run()}
			disabled={!canRedo}
		>
			<Icons.Repeat size={16} />
		</button>
	</div>

	<textarea
		bind:value={content}
		class="textarea textarea-lg hidden w-full"
        placeholder="A subterranean metropolis carved into the bones of a long-dead titan..."
	></textarea>

	<div
		bind:this={editorEl}
		class="tiptap-content preset-filled-surface-200-800 rounded-lg"
        placeholder="A subterranean metropolis carved into the bones of a long-dead titan..."
	></div>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	:global {
		
	}
</style>
