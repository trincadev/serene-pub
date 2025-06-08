<script lang="ts">
    import { onMount } from "svelte"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }
    let { onclose = $bindable() }: Props = $props()

    onMount(() => {
        onclose = async () => {
            return true
        }
    })
</script>

<div class="p-4 card preset-filled-primary-500 m-4">
    <p class="mb-2"><b>Not Implemented</b></p>
    <p>App settings will go here.</p>
    <!-- Add lorebook management UI here -->
</div>
