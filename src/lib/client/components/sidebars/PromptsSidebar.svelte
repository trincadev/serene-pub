<script lang="ts">
	import * as skio from "sveltekit-io"
	import { getContext, onDestroy, onMount } from "svelte"
	import * as Icons from "@lucide/svelte"
	import ContextConfigUnsavedChangesModal from "../modals/ContextConfigUnsavedChangesModal.svelte"
	import PromptConfigUnsavedChangesModal from "../modals/PromptConfigUnsavedChangesModal.svelte"
	import NewNameModal from "../modals/NewNameModal.svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import { z } from "zod"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}

	let { onclose = $bindable() }: Props = $props()

	const socket = skio.get()
	let userCtx: { user: SelectUser } = getContext("userCtx")
	let promptsList: Sockets.PromptConfigsList.Response["promptConfigsList"] =
		$state([])
	let selectedPromptId: number | undefined = $state(
		userCtx.user.activePromptConfigId || undefined
	)
	let promptConfig: Sockets.PromptConfig.Response["promptConfig"] = $state(
		{} as Sockets.PromptConfig.Response["promptConfig"]
	)
	let originalData: Sockets.PromptConfig.Response["promptConfig"] = $state(
		{} as Sockets.PromptConfig.Response["promptConfig"]
	)
	let unsavedChanges = $derived(
		JSON.stringify(promptConfig) !== JSON.stringify(originalData)
	)
	let showNewNameModal = $state(false)
	let showUnsavedChangesModal = $state(false)
	let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null

	// Zod validation schema
	const promptConfigSchema = z.object({
		name: z.string().min(1, "Name is required").trim()
	})

	type ValidationErrors = Record<string, string>
	let validationErrors: ValidationErrors = $state({})

	function validateForm(): boolean {
		const result = promptConfigSchema.safeParse({
			name: promptConfig.name
		})

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

	function handleSave() {
		if (!validateForm()) return
		socket.emit("updatePromptConfig", {
			promptConfig: { ...promptConfig, id: promptConfig.id }
		})
	}

	function handleDelete() {
		if (!promptConfig.isImmutable) {
			socket.emit("deletePromptConfig", { id: promptConfig.id })
			selectedPromptId = undefined
		}
	}

	function handleReset() {
		promptConfig = { ...originalData }
	}

	function handleNew() {
		showNewNameModal = true
	}

	function handleNewNameConfirm(name: string) {
		if (!name.trim()) return
		const newPromptConfig = {
			...promptConfig,
			name: name.trim(),
			isImmutable: false
		}
		delete newPromptConfig.id
		socket.emit("createPromptConfig", { promptConfig: newPromptConfig })
		showNewNameModal = false
	}

	function handleNewNameCancel() {
		showNewNameModal = false
	}

	async function handleOnClose() {
		if (unsavedChanges) {
			showUnsavedChangesModal = true
			return new Promise<boolean>((resolve) => {
				confirmCloseSidebarResolve = resolve
			})
		} else {
			return true
		}
	}

	function handleUnsavedChangesModalConfirm() {
		showUnsavedChangesModal = false
		if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(true)
	}
	function handleUnsavedChangesModalCancel() {
		showUnsavedChangesModal = false
		if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
	}
	function handleUnsavedChangesModalOpenChange(e: OpenChangeDetails) {
		if (!e.open) {
			showUnsavedChangesModal = false
			if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
		}
	}

	$effect(() => {
		if (
			!!selectedPromptId &&
			selectedPromptId !== userCtx.user.activePromptConfigId
		) {
			socket.emit("setUserActivePromptConfig", {
				id: selectedPromptId
			})
		}
	})

	$effect(() => {
		if (selectedPromptId) {
			socket.emit("promptConfig", { id: selectedPromptId })
		}
	})

	onMount(() => {
		socket.on(
			"promptConfigsList",
			(msg: Sockets.PromptConfigsList.Response) => {
				promptsList = msg.promptConfigsList
				if (!selectedPromptId && promptsList.length > 0) {
					selectedPromptId =
						userCtx.user.activePromptConfigId ?? promptsList[0].id
				}
			}
		)

		socket.on("promptConfig", (msg: Sockets.PromptConfig.Response) => {
			promptConfig = { ...msg.promptConfig }
			originalData = { ...msg.promptConfig }
		})

		socket.on(
			"createPromptConfig",
			(msg: Sockets.CreatePromptConfig.Response) => {
				selectedPromptId = msg.promptConfig.id
			}
		)
		socket.on(
			"updatePromptConfig",
			(msg: Sockets.UpdatePromptConfig.Response) => {
				if (msg.promptConfig.id === promptConfig.id) {
					promptConfig = { ...msg.promptConfig }
					originalData = { ...msg.promptConfig }
					toaster.success({ title: "Prompt Config Updated" })
				}
			}
		)
		socket.emit("promptConfigsList", {})
		if (selectedPromptId) {
			socket.emit("promptConfig", { id: selectedPromptId })
		}
		onclose = handleOnClose
	})

	onDestroy(() => {
		socket.off("promptConfigsList")
		socket.off("promptConfig")
		socket.off("createPromptConfig")
		socket.off("updatePromptConfig")
	})
</script>

<div class="text-foreground h-full p-4">
	<div class="mt-2 mb-2 flex gap-2 sm:mt-0">
		<button
			type="button"
			class="btn btn-sm preset-filled-primary-500"
			onclick={handleNew}
		>
			<Icons.Plus size={16} />
		</button>
		<button
			type="button"
			class="btn btn-sm preset-filled-secondary-500"
			onclick={handleReset}
			disabled={!unsavedChanges}
		>
			<Icons.RefreshCcw size={16} />
		</button>
		<button
			type="button"
			class="btn btn-sm preset-filled-error-500"
			onclick={handleDelete}
			disabled={!promptConfig || promptConfig.isImmutable}
		>
			<Icons.X size={16} />
		</button>
	</div>
	<div class="mb-6 flex items-center gap-2">
		<select class="select w-full" bind:value={selectedPromptId}>
			{#each promptsList.filter((c) => c.isImmutable) as c}
				<option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
			{/each}
			{#each promptsList.filter((c) => !c.isImmutable) as c}
				<option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
			{/each}
		</select>
	</div>
	{#if promptConfig}
		<div class="mt-4 mb-4 flex w-full justify-end gap-2">
			<button
				class="btn btn-sm preset-filled-success-500 w-full"
				onclick={handleSave}
				disabled={promptConfig.isImmutable || !unsavedChanges}
			>
				<Icons.Save size={16} />
				Save
			</button>
		</div>
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label class="font-semibold" for="promptName">Name*</label>
				<input
					id="promptName"
					type="text"
					bind:value={promptConfig.name}
					class="input w-full {validationErrors.name
						? 'border-red-500'
						: ''}"
					disabled={promptConfig.isImmutable}
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
			</div>
			<div class="flex flex-col gap-1">
				<label class="font-semibold" for="systemPrompt">
					System Instructions
				</label>
				<textarea
					id="systemPrompt"
					rows="15"
					bind:value={promptConfig.systemPrompt}
					class="input w-full"
				></textarea>
			</div>
		</div>
	{/if}
</div>

<PromptConfigUnsavedChangesModal
	open={showUnsavedChangesModal}
	onOpenChange={handleUnsavedChangesModalOpenChange}
	onConfirm={handleUnsavedChangesModalConfirm}
	onCancel={handleUnsavedChangesModalCancel}
/>
<NewNameModal
	open={showNewNameModal}
	onOpenChange={(e) => (showNewNameModal = e.open)}
	onConfirm={handleNewNameConfirm}
	onCancel={handleNewNameCancel}
	title="New Prompt Config"
	description="Your current settings will be copied."
/>
