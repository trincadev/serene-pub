<script lang="ts">
	import { Modal } from "@skeletonlabs/skeleton-svelte"
	import { z } from "zod"

	interface Props {
		open: boolean
		onOpenChange: (e: OpenChangeDetails) => void
		onConfirm: (name: string) => void
		onCancel: () => void
		title?: string
		description?: string
	}

	let {
		open = $bindable(),
		onOpenChange,
		onConfirm,
		onCancel,
		title,
		description
	}: Props = $props()

	// Zod validation schema
	const nameSchema = z.object({
		name: z.string().min(1, "Name is required").trim()
	})

	type ValidationErrors = Record<string, string>

	let name = $state("")
	let inputRef: HTMLInputElement | null = null
	let validationErrors: ValidationErrors = $state({})
	$effect(() => {
		if (open && inputRef) inputRef.focus()
	})
	let isValid = $derived(
		!!name.trim() && Object.keys(validationErrors).length === 0
	)

	function validateForm(): boolean {
		const result = nameSchema.safeParse({ name })

		if (result.success) {
			validationErrors = {}
			return true
		} else {
			const errors: ValidationErrors = {}
			result.error.errors.forEach((error) => {
				if (error.path.length > 0) {
					errors[error.path[0] as string] = error.message
				}
			})
			validationErrors = errors
			return false
		}
	}
</script>

<Modal
	{open}
	{onOpenChange}
	contentBase="card bg-surface-100-900 p-6 space-y-6 shadow-xl max-w-md"
	backdropClasses="backdrop-blur-sm"
>
	{#snippet content()}
		<header class="flex justify-between">
			<h2 class="h2">{title ? title : "Create new"}</h2>
		</header>
		<article class="space-y-4">
			{#if description}
				<p class="text-muted-foreground">{description}</p>
			{/if}
			<input
				bind:this={inputRef}
				bind:value={name}
				class="input w-full {validationErrors.name
					? 'border-red-500'
					: ''}"
				type="text"
				placeholder="Enter a name..."
				onkeydown={(e) => {
					if (e.key === "Enter" && isValid) {
						if (validateForm()) {
							onConfirm(name)
						}
					}
				}}
				oninput={() => {
					if (validationErrors.name) {
						const { name, ...rest } = validationErrors
						validationErrors = rest
					}
				}}
			/>
			{#if validationErrors.name}
				<p class="mt-1 text-sm text-red-500" role="alert">
					{validationErrors.name}
				</p>
			{/if}
		</article>
		<footer class="flex justify-end gap-4">
			<button class="btn preset-filled-surface-500" onclick={onCancel}>
				Cancel
			</button>
			<button
				class="btn preset-filled-primary-500"
				onclick={() => {
					if (validateForm()) {
						onConfirm(name)
					}
				}}
				disabled={!isValid}
			>
				Confirm
			</button>
		</footer>
	{/snippet}
</Modal>
