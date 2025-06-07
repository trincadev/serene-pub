<script lang="ts">
    import skio from "sveltekit-io"

    let { connection } = $props()

    let ollamaFields = $state({})
    let availableOllamaModels = $state([])

    const socket = skio.get()

    // Parse and sync extraJson
    function parseExtraJson(json) {
        if (!json) return {}
        try {
            return JSON.parse(json)
        } catch {
            return {}
        }
    }
    function toExtraJson(fields) {
        try {
            return JSON.stringify(fields)
        } catch {
            return "{}"
        }
    }

    if (connection && !connection.baseUrl) {
        connection.baseUrl = "http://localhost:11434/"
    }
    
    handleRefreshModels()

    $effect(() => {
        if (connection && connection.type === "ollama") {
            ollamaFields = parseExtraJson(connection.extraJson)
            // Set default prompt to connection name for new connections
            if (!ollamaFields.prompt && connection.name) {
                ollamaFields = { ...ollamaFields, prompt: connection.name }
            }
        }
    })

    $effect(() => {
        if (connection && connection.type === "ollama") {
            connection.extraJson = toExtraJson(ollamaFields)
        }
    })

    // Set the name as the default for the "new" prompt
    $effect(() => {
        if (
            connection &&
            connection.type === "ollama" &&
            (!ollamaFields.prompt || ollamaFields.prompt === "") &&
            connection.name &&
            connection.id === undefined // likely a new connection
        ) {
            ollamaFields = { ...ollamaFields, prompt: connection.name }
        }
    })

    function handleRefresh(msg) {
        if (msg.models) availableOllamaModels = msg.models
    }

    socket.on("refreshOllamaModels", handleRefresh)

    function handleRefreshModels() {
        socket.emit("refreshOllamaModels", { baseUrl: connection.baseUrl })
    }
    function handleOllamaFieldChange(key, value) {
        ollamaFields = { ...ollamaFields, [key]: value }
    }

    let testResult: { ok: boolean; error?: string; models?: any[] } | null = $state(null)

    function handleTestConnection() {
        testResult = null
        socket.emit("testConnection", { connection })
    }
    $effect(() => {
        function handleTest(msg) {
            testResult = msg
        }
        socket.on("testConnection", handleTest)
        return () => { socket.off && socket.off("testConnection", handleTest) }
    })

    let isValid = $derived.by(() => {
        return (
            connection &&
            connection.type === "ollama" &&
            connection.baseUrl &&
            connection.model
        )
    })
</script>

{#if connection}
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
        <button type="button" class="btn btn-sm preset-tonal-primary mt-2" onclick={handleRefreshModels}
            >Refresh Models</button
        >
    </div>
    <div class="mt-2 flex flex-col gap-1">
        <label class="font-semibold disabled" for="ollamaApiKey">Ollama API Key</label>
        <input
            id="ollamaApiKey"
            type="text"
            bind:value={ollamaFields.apiKey}
            oninput={(e) => handleOllamaFieldChange("apiKey", e.target.value)}
            class="input input-sm bg-background border-muted w-full rounded border"
            disabled
        />
    </div>
    <div class="mt-2 flex flex-col gap-1">
        <label class="font-semibold disabled" for="ollamaCustomHeaders">Custom Headers (JSON)</label>
        <textarea
            id="ollamaCustomHeaders"
            bind:value={ollamaFields.customHeaders}
            oninput={(e) => handleOllamaFieldChange("customHeaders", e.target.value)}
            class="input input-sm bg-background border-muted w-full rounded border"
            rows="2"
            disabled
        ></textarea>
    </div>
    <button type="button" class="btn preset-tonal-success btn-sm w-full mt-2" onclick={handleTestConnection}>
        {#if testResult}
            Okay!
        {:else}
            Test Connection
        {/if}
    </button>
{/if}
