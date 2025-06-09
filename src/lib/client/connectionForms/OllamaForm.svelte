<script lang="ts">
    import { onMount } from "svelte"
    import skio from "sveltekit-io"

    interface ExtraFieldData {
        stream: boolean;
        raw: boolean;
        think: boolean;
        keepAliveNumber: number;
        keepAliveUnit: string;
    }

    interface ExtraJson {
        stream?: boolean;
        raw?: boolean;
        think?: boolean;
        keepAlive?: string;
    }

    interface Props {
        connection: SelectConnection
    }

    let { connection = $bindable() } = $props()

    const socket = skio.get()
    const defaultExtraJson = {
            stream: false,
            raw: false,
            think: false,
            keepAlive: "300ms",
        }

    let availableOllamaModels: Sockets.RefreshModels.Response["models"] = $state([])
    let ollamaFields: ExtraFieldData | undefined = $state()

    socket.on("refreshModels", (msg: Sockets.RefreshModels.Response) => {
        if (msg.models) availableOllamaModels = msg.models
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

    let isValid = $derived.by(() => {
        return (
            connection &&
            connection.type === "ollama" &&
            connection.baseUrl &&
            connection.model
        )
    })

    function extraJsonToExtraFields(extraJson: ExtraJson): ExtraFieldData {
        return {
            stream: extraJson.stream || false,
            raw: extraJson.raw || false,
            think: extraJson.think || false,
            keepAliveNumber: extraJson.keepAlive ? parseInt(extraJson.keepAlive) || 300 : 300,
            keepAliveUnit: extraJson.keepAlive ? extraJson.keepAlive.replace(/^[0-9]+/, "") : "ms",
        }
    }

    function extraFieldsToExtraJson(fields: ExtraFieldData): ExtraJson {
        return {
            stream: fields.stream,
            raw: fields.raw,
            think: fields.think,
            keepAlive: `${fields.keepAliveNumber}${fields.keepAliveUnit}`,
        }
    }

    $effect(() => {
        const _ollamaFields = ollamaFields
        if (_ollamaFields) {
            connection.extraJson = extraFieldsToExtraJson(_ollamaFields)
        }
    })

    onMount(() => {
        if (connection.extraJson) {
            const extraJson = { ...defaultExtraJson, ...connection.extraJson }
            ollamaFields = extraJsonToExtraFields(extraJson)
        } else {
            ollamaFields = extraJsonToExtraFields(defaultExtraJson)
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
            class="input input-sm bg-background border-muted w-full rounded border"
        >
            <option value="">-- Select Model --</option>
            {#each availableOllamaModels as m}
                <option value={m.model}>{m.name}</option>
            {/each}
        </select>
    </div>
    <div class="flex gap-2 mt-4">
        <button type="button" class="btn btn-sm preset-tonal-primary w-full" onclick={handleRefreshModels}>
            Refresh Models
        </button>
        <button type="button" class="btn preset-tonal-success btn-sm w-full" onclick={handleTestConnection}>
            {#if testResult?.ok === true}
                Test: Okay!
            {:else if testResult?.ok === false}
                Test: Failed!
            {:else}
                Test Connection
            {/if}
        </button>
    </div>
    <details class="mt-4">
        <summary class="cursor-pointer font-semibold">Advanced Settings</summary>
        <div class="mt-2 flex flex-col gap-1">
            <label class="font-semibold" for="baseUrl">Base URL</label>
            <input
                id="baseUrl"
                type="text"
                bind:value={connection.baseUrl}
                placeholder="http://localhost:11434/"
                required
                class="input input-sm bg-background border-muted w-full rounded border"
            />
        </div>
        {#if ollamaFields}
        <div class="mt-2 flex flex-col gap-1">
            <label class="font-semibold" for="stream">Stream</label>
            <input
                id="stream"
                type="checkbox"
                bind:checked={ollamaFields.stream}
                class="input input-sm bg-background border-muted w-6 h-6 rounded border"
            />
        </div>
        {/if}
        {#if ollamaFields}
        <div class="mt-2 flex flex-col gap-1">
            <label class="font-semibold" for="raw">Raw</label>
            <input
                id="raw"
                type="checkbox"
                bind:checked={ollamaFields.raw}
                class="input input-sm bg-background border-muted w-6 h-6 rounded border"
            />
        </div>
        {/if}
        {#if ollamaFields}
        <div class="mt-2 flex flex-col gap-1">
            <label class="font-semibold" for="think">Think</label>
            <input
                id="think"
                type="checkbox"
                bind:checked={ollamaFields.think}
                class="input input-sm bg-background border-muted w-6 h-6 rounded border"
            />
        </div>
        {/if}
        {#if ollamaFields}
        <div class="mt-2 flex flex-col gap-1">
            <label class="font-semibold" for="keepAlive">Keep Alive</label>
            <div class="flex gap-2 items-center">
                <input
                    id="keepAliveNumber"
                    type="number"
                    min="0"
                    bind:value={ollamaFields.keepAliveNumber}
                    class="input input-sm bg-background border-muted w-20 rounded border"
                />
                <select
                    id="keepAliveUnit"
                    bind:value={ollamaFields.keepAliveUnit}
                    class="input input-sm bg-background border-muted w-16 rounded border"
                >
                    <option value="ms">ms</option>
                    <option value="s">s</option>
                    <option value="m">m</option>
                    <option value="h">h</option>
                </select>
            </div>
        </div>
        {/if}
    </details>
{/if}
