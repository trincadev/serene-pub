<script lang="ts">
    import { Tabs } from "@skeletonlabs/skeleton-svelte"
    import * as Icons from "@lucide/svelte"
    import { type Snippet } from "svelte";
    import { renderMarkdownWithQuotedText } from "$lib/client/utils/markdownToHTML"

    interface Props {
        markdown: string
        classes?: string
        compiledPrompt?: CompiledPrompt
        leftControls?: Snippet
        rightControls?: Snippet
        extraTabs?: {
            value: string
            title: string
            control: Snippet
            content: Snippet
        }[]
        onSend: () => void
    }
    let {
        markdown = $bindable(),
        compiledPrompt = $bindable(),
        classes,
        leftControls,
        rightControls,
        extraTabs = $bindable(),
        onSend
    }: Props = $props()

    let tabGroup: "compose" | "preview" = $state("compose")
    let contextExceeded = $derived( !!compiledPrompt ? compiledPrompt!.meta.tokenCounts.total > compiledPrompt!.meta.tokenCounts.limit : false )

    function handleSend(e: KeyboardEvent | MouseEvent | undefined = undefined) {
        if (e) e.preventDefault()
        onSend()
    }
</script>

<Tabs value={tabGroup} {classes} onValueChange={(e) => (tabGroup = e.value as "compose" | "preview")}>
    {#snippet list()}
        <Tabs.Control value="compose"
            ><span title="Compose"><Icons.Pen size="0.75em" /></span></Tabs.Control
        >
        <Tabs.Control value="preview"
            ><span title="Preview"><Icons.Eye size="0.75em" /></span></Tabs.Control
        >
        {#if extraTabs}
            {#each extraTabs as tab}
                <Tabs.Control value={tab.value}>
                    <span title={tab.title}>{@render tab.control?.()}</span>
                </Tabs.Control>
            {/each}
        {/if}
        {#if compiledPrompt}
            <Tabs.Control value="tokenCount" classes="w-full text-right" disabled>
                <span title="Token Count" class="text-xs" class:text-error-500={contextExceeded}>
                    {compiledPrompt.meta.tokenCounts.total} / {compiledPrompt.meta.tokenCounts.limit}
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
                        class="input field-sizing-content lg:min-h-[3.75em] flex-1"
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
                {#if extraTabs}
                    {#each extraTabs as tab}
                        <Tabs.Panel value={tab.value}>
                            {@render tab.content?.()}
                        </Tabs.Panel>
                    {/each}
                {/if}
            </div>
            {@render rightControls?.()}
        </div>
    {/snippet}
</Tabs>
