<script lang="ts">
    import { Tabs } from "@skeletonlabs/skeleton-svelte"
    import * as Icons from "@lucide/svelte"
    import { onMount, type Snippet } from "svelte";
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
    let submitOnEnter = $state(true)

    function handleSend(e: KeyboardEvent | MouseEvent | undefined = undefined) {
        if (e) e.preventDefault()
        onSend()
    }

    onMount(() => {
        const mq = window.matchMedia("(min-width: 1024px)")
		const update = () => (submitOnEnter = mq.matches)
		update()
		mq.addEventListener("change", update)
		return () => mq.removeEventListener("change", update)
    })

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
            e.preventDefault()
            handleSend(e)
        }}
</script>

<Tabs value={tabGroup} {classes} onValueChange={(e) => (tabGroup = e.value as "compose" | "preview")}>
    {#snippet list()}
        <Tabs.Control value="compose" classes="min-h-[2.75em]"
            ><span title="Compose"><Icons.Pen size="0.75em" /></span></Tabs.Control
        >
        <Tabs.Control value="preview" classes="min-h-[2.75em]"
            ><span title="Preview"><Icons.Eye size="0.75em" /></span></Tabs.Control
        >
        {#if extraTabs}
            {#each extraTabs as tab}
                <Tabs.Control value={tab.value} classes="min-h-[2.75em]" >
                    <span title={tab.title}>{@render tab.control?.()}</span>
                </Tabs.Control>
            {/each}
        {/if}
        {#if compiledPrompt}
            <Tabs.Control value="tokenCount" classes="w-full text-right min-h-[2.75]" disabled >
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
                        class="input field-sizing-content lg:min-h-[3.75em] flex-1 rounded-xl"
                        placeholder="Type a message..."
                        bind:value={markdown}
                        autocomplete="off"
                        spellcheck="true"
                        onkeydown={handleKeyDown}
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
