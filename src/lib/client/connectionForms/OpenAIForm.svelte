<script lang="ts">
    import { PromptFormats } from "$lib/shared/constants/PromptFormats"
    import { TokenCounterOptions } from "$lib/shared/constants/TokenCounters"
    import { onMount } from "svelte"
    import * as skio from "sveltekit-io"

    interface ExtraFieldData {
        stream: boolean
        apiKey: string
        prerenderPrompt: boolean
    }

    interface ExtraJson {
        stream?: boolean
        apiKey?: string
        prerenderPrompt: boolean
    }

    interface Props {
        connection: SelectConnection
    }

    let { connection = $bindable() } = $props()

    const socket = skio.get()
    const defaultExtraJson = {
        stream: false,
        apiKey: "",
        prerenderPrompt: false
    }

    let availableOpenAIModels: Sockets.RefreshModels.Response["models"] = $state([])
    let openAIFields: ExtraFieldData | undefined = $state()

    socket.on("refreshModels", (msg: Sockets.RefreshModels.Response) => {
        if (msg.models) availableOpenAIModels = msg.models
    })

    socket.on("testConnection", (msg: Sockets.TestConnection.Response) => {
        testResult = msg
    })

    function handleRefreshModels() {
        socket.emit("refreshModels", { connection } as Sockets.RefreshModels.Call)
    }

    let testResult: { ok: boolean; error?: string; models?: any[] } | null = $state(null)

    function handleTestConnection() {
        testResult = null
        socket.emit("testConnection", { connection } as Sockets.TestConnection.Call)
    }

    // let isValid = $derived.by(() => {
    //     return connection && connection.type === "openai" && connection.baseUrl && connection.model
    // })

    function extraJsonToExtraFields(extraJson: ExtraJson): ExtraFieldData {
        return {
            stream: extraJson.stream ?? false,
            apiKey: extraJson.apiKey || "",
            prerenderPrompt: extraJson.prerenderPrompt ?? false
        }
    }

    function extraFieldsToExtraJson(fields: ExtraFieldData): ExtraJson {
        return {
            stream: fields.stream,
            apiKey: fields.apiKey,
            prerenderPrompt: fields.prerenderPrompt
        }
    }

    $effect(() => {
        const _openAIFields = openAIFields
        if (_openAIFields) {
            connection.extraJson = extraFieldsToExtraJson(_openAIFields)
        }
    })

    $effect(() => {
        console.log("extraJson", $state.snapshot(openAIFields))
    })

    onMount(() => {
        if (connection.extraJson) {
            console.log("Using existing extraJson", connection.extraJson)
            const extraJson = { ...defaultExtraJson, ...connection.extraJson }
            openAIFields = extraJsonToExtraFields(extraJson)
        } else {
            openAIFields = extraJsonToExtraFields(defaultExtraJson)
        }
        handleRefreshModels()
    })
</script>

{#if connection}
    <div class="mt-2 flex flex-col gap-1">
        <label class="font-semibold" for="model">Model</label>
        <select
            id="model"
            bind:value={connection.model}
            class="select bg-background border-muted w-full rounded border"
        >
            <option value="">-- Select Model --</option>
            {#each availableOpenAIModels as m}
                <option value={m.id}>{m.id}</option>
            {/each}
        </select>
    </div>
    <div class="mt-4 flex gap-2">
        <button
            type="button"
            class="btn btn-sm preset-tonal-primary w-full"
            onclick={handleRefreshModels}
        >
            Refresh Models
        </button>
        <button
            type="button"
            class="btn preset-tonal-success btn-sm w-full"
            onclick={handleTestConnection}
        >
            {#if testResult?.ok === true}
                Test: Okay!
            {:else if testResult?.ok === false}
                Test: Failed!
            {:else}
                Test Connection
            {/if}
        </button>
    </div>
    <div class="mt-2 flex flex-col gap-1">
        <label class="font-semibold" for="promptFormat">Prompt Format</label>
        <select
            id="promptFormat"
            class="select bg-background border-muted w-full rounded border"
            bind:value={connection.promptFormat}
        >
            {#each PromptFormats.options as option}
                <option value={option.value}>{option.label}</option>
            {/each}
        </select>
    </div>
    <div class="mt-2 flex flex-col gap-1">
        <label class="font-semibold" for="tokenCounter">Token Counter</label>
        <select
            id="tokenCounter"
            bind:value={connection.tokenCounter}
            class="select bg-background border-muted w-full rounded border"
        >
            {#each TokenCounterOptions.options as t}
                <option value={t.value}>{t.label}</option>
            {/each}
        </select>
    </div>
        <div class="mt-2 flex flex-col gap-1">
            <label class="font-semibold" for="baseUrl">Base URL</label>
            <input
                id="baseUrl"
                type="text"
                bind:value={connection.baseUrl}
                placeholder="https://api.openai.com/v1/"
                required
                class="input"
            />
        </div>
        {#if openAIFields}
            <div class="mt-2 flex flex-col gap-1">
                <label class="font-semibold" for="apiKey">API Key</label>
                <input
                    id="apiKey"
                    type="password"
                    bind:value={openAIFields.apiKey}
                    placeholder="sk-..."
                    class="input"
                />
            </div>
            <div class="mt-2 flex flex-col gap-1">
                <label class="font-semibold" for="stream">Stream</label>
                <input
                    id="stream"
                    type="checkbox"
                    bind:checked={openAIFields.stream}
                    class="input bg-background border-muted h-6 w-6 rounded border"
                />
            </div>
            <div class="mt-2 flex flex-col gap-1">
                <label class="font-semibold" for="prerenderPrompt">Prerender Prompt</label>
                <input
                    id="prerenderPrompt"
                    type="checkbox"
                    bind:checked={openAIFields.prerenderPrompt}
                    class="input bg-background border-muted h-6 w-6 rounded border"
                />
            </div>
        {/if}
{/if}
