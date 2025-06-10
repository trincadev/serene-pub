<script lang="ts">
    import { Tabs } from "@skeletonlabs/skeleton-svelte"
    import * as Icons from "@lucide/svelte"
    import { marked } from "marked"
    import { type Snippet } from "svelte";
    import { renderMarkdownWithQuotedText } from "$lib/client/utils/markdownToHTML"

    interface Props {
        markdown: string
        tokenCounts?: {
            tokenCount: number
            tokenLimit?: number
            error?: string
        }
        leftControls?: Snippet
        rightControls?: Snippet
        onSend: () => void
    }
    let {
        markdown = $bindable(),
        tokenCounts = $bindable(),
        leftControls,
        rightControls,
        onSend
    }: Props = $props()

    let tabGroup: "compose" | "preview" = $state("compose")

    function handleSend(e: KeyboardEvent | MouseEvent | undefined = undefined) {
        if (e) e.preventDefault()
        onSend()
    }
</script>

<Tabs value={tabGroup} onValueChange={(e) => (tabGroup = e.value as "compose" | "preview")}>
    {#snippet list()}
        <Tabs.Control value="compose"
            ><span title="Compose"><Icons.Pen size="0.75em" /></span></Tabs.Control
        >
        <Tabs.Control value="preview"
            ><span title="Preview"><Icons.Eye size="0.75em" /></span></Tabs.Control
        >
        {#if tokenCounts}
            <Tabs.Control value="tokenCount" classes="w-full text-right" disabled>
                <span title="Token Count" class="text-xs">
                    {tokenCounts.tokenCount} /
                    {#if tokenCounts.tokenLimit}
                        {tokenCounts.tokenLimit}
                    {:else}
                        No token limit set
                    {/if}
                </span>
            </Tabs.Control>
        {/if}
    {/snippet}
    {#snippet content()}
        <div class="flex gap-4">
            {@render leftControls?.()}
            <div class="w-full">
                <Tabs.Panel value="compose">
                    <textarea
                        class="input input-sm field-sizing-content min-h-[3.75em] flex-1"
                        placeholder="Type a message..."
                        bind:value={markdown}
                        autocomplete="off"
                        spellcheck="true"
                        onkeydown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                    >
                    </textarea>
                </Tabs.Panel>
                <Tabs.Panel value="preview">
                    <div class="card bg-surface-100-900 min-h-[4em] w-full rounded-lg p-2">
                        <div class="rendered-chat-message-content">
                            {@html renderMarkdownWithQuotedText(markdown)}
                        </div>
                    </div>
                </Tabs.Panel>
            </div>
            {@render rightControls?.()}
        </div>
    {/snippet}
</Tabs>
