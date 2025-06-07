<script lang="ts">
    import { onMount } from "svelte"


    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    async function handleOnClose() {
        return true
    }

    onMount(() => {
        onclose = handleOnClose
    })

</script>

<div class="p-4 card preset-filled-primary-500 m-4">
    <p class="mb-2"><b>Not Implemented</b></p>
    <p>Lorebooks and lorebook entries (SillyTavern-compatible) will go here.</p>
    <!-- Add lorebook management UI here -->
</div>
