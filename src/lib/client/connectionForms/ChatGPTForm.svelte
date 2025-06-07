<script lang="ts">
let { connection } = $props();
import skio from "sveltekit-io"
let testResult: { ok: boolean; error?: string } | null = $state(null)
const socket = skio.get()
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
</script>

{#if connection}
    <div class="flex flex-col gap-1 mt-2">
        <label class="font-semibold" for="baseUrl">Base URL</label>
        <input id="baseUrl" type="text" bind:value={connection.baseUrl} class="input input-sm bg-background border-muted w-full rounded border" />
    </div>
    <div class="flex flex-col gap-1 mt-2">
        <label class="font-semibold" for="model">Model</label>
        <input id="model" type="text" bind:value={connection.model} class="input input-sm bg-background border-muted w-full rounded border" />
    </div>
    <div class="flex flex-col gap-1 mt-2">
        <label class="font-semibold" for="enabled">Enabled</label>
        <input id="enabled" type="checkbox" bind:checked={connection.enabled} class="accent-primary" />
    </div>
    <div class="flex flex-col gap-1 mt-2">
        <label class="font-semibold" for="chatgptApiKey">ChatGPT API Key</label>
        <input id="chatgptApiKey" type="text" bind:value={connection.apiKey} class="input input-sm bg-background border-muted w-full rounded border" />
    </div>
    <button type="button" class="btn preset-filled-primary-500 w-full mt-2" onclick={handleTestConnection}>Test Connection</button>
    {#if testResult}
        <div class="text-sm mt-1">
            {#if testResult.ok}
                <span class="text-success">Connection OK</span>
            {:else}
                <span class="text-error">{testResult.error}</span>
            {/if}
        </div>
    {/if}
{/if}
