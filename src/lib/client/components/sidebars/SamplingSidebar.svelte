<script lang="ts">
	import * as skio from "sveltekit-io"
	import { getContext, onMount, tick } from "svelte"
	import * as Icons from "@lucide/svelte"
	import SamplingConfigUnsavedChangesModal from "../modals/PromptConfigUnsavedChangesModal.svelte"
	import NewNameModal from "../modals/NewNameModal.svelte"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}

	let { onclose = $bindable() }: Props = $props()

	let userCtx: { user: SelectUser } = getContext("userCtx")

	const socket = skio.get()

	let sampling: SelectSamplingConfig | undefined = $state()
	let originalSamplingConfig: SelectSamplingConfig | undefined = $state()
	let unsavedChanges = $derived.by(() => {
		if (!sampling || !originalSamplingConfig) return false
		// Compare current sampling with original to detect changes
		return (
			JSON.stringify(sampling) !== JSON.stringify(originalSamplingConfig)
		)
	})
	let showSelectSamplingConfig = $state(false)
	let showUnsavedChangesModal = $state(false)
	let showNewNameModal = $state(false)
	let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null
	let editingField: string | null = $state(null)

	type FieldType = "number" | "boolean" | "string"

	const fieldMeta: Record<
		string,
		{
			label: string
			type: FieldType
			min?: number
			max?: number
			step?: number
			unlockedMax?: number
			default?: number
		}
	> = {
		responseTokens: {
			label: "Response Tokens",
			type: "number",
			min: 1,
			max: 4096,
			step: 1,
			unlockedMax: 65536
		}, // Unlocked max for response tokens
		contextTokens: {
			label: "Context Tokens",
			type: "number",
			min: 1,
			max: 32768,
			step: 1,
			unlockedMax: 524288
		}, // Unlocked max for context tokens
		temperature: {
			label: "Temperature",
			type: "number",
			min: 0,
			max: 2,
			step: 0.01
		},
		topP: { label: "Top P", type: "number", min: 0, max: 1, step: 0.01 },
		topK: { label: "Top K", type: "number", min: 0, max: 200, step: 1 },
		repetitionPenalty: {
			label: "Repetition Penalty",
			type: "number",
			min: 0.5,
			max: 2,
			step: 0.01
		},
		frequencyPenalty: {
			label: "Frequency Penalty",
			type: "number",
			min: 0,
			max: 2,
			step: 0.01
		},
		presencePenalty: {
			label: "Presence Penalty",
			type: "number",
			min: 0,
			max: 2,
			step: 0.01
		},
		seed: { label: "Seed", type: "number", min: -1, max: 999999, step: 1 }
	}

	// Helper: Show field if enabled, or if no enabled flag exists
	function isFieldVisible(key: string) {
		const enabledKey = key + "Enabled"
		return (
			key !== "isImmutable" &&
			(sampling![enabledKey] === undefined || sampling![enabledKey])
		)
	}

	function getFieldMax(key: string): number {
		// Check if the field is contextTokens or responseTokens
		if (
			(key === "contextTokens" && sampling!.contextTokensUnlocked) ||
			(key === "responseTokens" && sampling!.responseTokensUnlocked)
		) {
			const unlockedMax = fieldMeta[key]?.unlockedMax
			return unlockedMax !== undefined ? unlockedMax : getFieldMax(key)
		}
		// For other fields, return the defined max
		return fieldMeta[key]?.max ?? 0
	}

	// Focus helper for manual input
	async function focusInput(id: string) {
		await tick()
		const el = document.getElementById(id)
		if (el) el.focus()
	}

	// Mock list of saved sampling for dropdown
	let samplingConfigsList: Sockets.SamplingConfigList.Response["samplingConfigsList"] =
		$state([])

	function handleSelectChange(e: Event) {
		socket.emit("setUserActiveSamplingConfig", {
			id: (e.target as HTMLSelectElement).value
		})
	}

	function handleNew() {
		showNewNameModal = true
	}
	function handleNewNameConfirm(name: string) {
		const newSamplingConfig = { ...sampling }
		delete newSamplingConfig.id
		delete newSamplingConfig.isImmutable
		newSamplingConfig.name = name.trim()
		socket.emit("createSamplingConfig", { sampling: newSamplingConfig })
		showNewNameModal = false
	}
	function handleNewNameCancel() {
		showNewNameModal = false
	}

	function handleUpdate() {
		if (sampling!.isImmutable) {
			alert("Cannot save immutable sampling.")
			return
		}
		socket.emit("updateSamplingConfig", { sampling })
	}

	function handleReset() {
		sampling = { ...originalSamplingConfig }
	}

	function handleDelete() {
		if (sampling!.isImmutable) {
			alert("Cannot delete immutable sampling.")
			return
		}
		if (
			confirm(
				"Are you sure you want to delete these sampling? This cannot be undone."
			)
		) {
			socket.emit("deleteSamplingConfig", {
				id: userCtx.user.activeSamplingConfigId
			})
		}
	}

	function handleSelectSamplingConfig() {
		showSelectSamplingConfig = true
	}
	function handleBackToSidebar() {
		showSelectSamplingConfig = false
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

	onMount(() => {
		onclose = handleOnClose
		socket.on("sampling", (message: Sockets.SamplingConfig.Response) => {
			sampling = { ...message.sampling }
			originalSamplingConfig = { ...message.sampling }
		})

		socket.on(
			"samplingConfigsList",
			(message: Sockets.SamplingConfigList.Response) => {
				samplingConfigsList = message.samplingConfigsList
				if (!userCtx.user.activeSamplingConfigId &&
					samplingConfigsList.length > 0) {
					socket.emit("setUserActiveSamplingConfig", {
						id: samplingConfigsList[0].id
					})
				}
			}
		)

		socket.emit("sampling", { id: userCtx.user.activeSamplingConfigId })
		socket.emit("samplingConfigsList", {})
	})

	$effect(() => {
		console.log("SamplingSidebar list", $state.snapshot(samplingConfigsList))
	})
</script>

<div class="text-foreground p-4 min-h-100">
	{#if showSelectSamplingConfig}
		<!-- ENABLE / DISABLE WEIGHTS -->
		<div
			class="animate-fade-in rounded-lg border p-2 shadow-lg border-surface-500/25 min-h-full"
		>
			<button
				type="button"
				class="btn preset-tonal-primary mb-4"
				onclick={handleBackToSidebar}
			>
				<Icons.ArrowLeft /> Back
			</button>
			<h2 class="mb-4 text-lg font-bold">
				Enable/Disable Weight Options
			</h2>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each Object.entries(fieldMeta) as [key, meta]}
					{#if meta.type === "number" || meta.type === "boolean"}
						<label
							class="hover:bg-muted flex items-center gap-2 rounded p-2 transition"
						>
							<input
								type="checkbox"
								bind:checked={sampling[key + "Enabled"]!}
								class="accent-primary"
								disabled={sampling[key + "Enabled"] ===
									undefined}
							/>
							<span class="font-medium">{meta.label}</span>
						</label>
					{/if}
				{/each}
			</div>
		</div>
	{:else if !!sampling}
		<!-- MANAGE WEIGHTS -->
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
				disabled={!!sampling && sampling.isImmutable}
			>
				<Icons.X size={16} />
			</button>
		</div>
		<div
			class="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center"
		>
			<select
				class="select select-sm bg-background border-muted rounded border"
				onchange={handleSelectChange}
				bind:value={userCtx.user.activeSamplingConfigId}
                disabled={unsavedChanges}
			>
				{#each samplingConfigsList.filter((w) => w.isImmutable) as w}
					<option value={w.id}>
						{w.name}{#if w.isImmutable}*{/if}
					</option>
				{/each}
				{#each samplingConfigsList.filter((w) => !w.isImmutable) as w}
					<option value={w.id}>
						{w.name}{#if w.isImmutable}*{/if}
					</option>
				{/each}
			</select>
		</div>
		<div class="mb-4 flex gap-2">
			<button
				type="button"
				class="btn btn-sm preset-tonal-primary w-full"
				onclick={handleSelectSamplingConfig}
			>
            <Icons.CheckSquare size={16} />
				Select Samplers
			</button>
			<button
				type="button"
				class="btn btn-sm preset-filled-success-500 w-full"
				onclick={handleUpdate}
				disabled={(!!sampling && sampling.isImmutable) ||
					!unsavedChanges}
			>
				<Icons.Save size={16} /> Save
			</button>
		</div>

		<form class="space-y-4">
			<div class="flex flex-col gap-1">
				<label class="font-semibold" for="samplingName">Name</label>
				<input
					id="samplingName"
					type="text"
					bind:value={sampling.name}
					class="input"
					disabled={!!sampling && sampling.isImmutable}
				/>
			</div>
			{#each Object.entries(fieldMeta) as [key, meta]}
				{#if isFieldVisible(key)}
					<div class="flex flex-col gap-1">
						<label class="font-semibold" for={key}>
							{meta?.label ?? key}
						</label>
						{#if meta?.type === "number"}
							<div class="flex flex-col items-center gap-2">
								<input
									type="range"
									min={meta.min}
									max={getFieldMax(key)}
									step={meta.step}
									id={key}
									bind:value={sampling![key]}
									class="accent-primary w-full"
								/>
								<div
									class="text-muted-foreground flex w-full justify-between gap-1 text-xs"
								>
									<span
										title="Minimum value"
										class="select-none"
									>
										{meta.min}
									</span>
									{#if editingField === key}
										<input
											type="number"
											min={meta.min}
											max={getFieldMax(key)}
											step={meta.step}
											bind:value={sampling![key]}
											id={key + "-manual"}
											class="border-primary input w-16 rounded border "
											onblur={() => (editingField = null)}
											onkeydown={(e) => {
												if (
													e.key === "Enter" ||
													e.key === "Escape"
												)
													editingField = null
											}}
										/>
									{:else}
										<button
											class="hover:bg-muted cursor-pointer rounded px-1 py-0.5"
											title="Edit"
											onclick={async () => {
												editingField = key
												await focusInput(
													key + "-manual"
												)
											}}
										>
											{sampling![key]}
										</button>
									{/if}
									<span
										title="Maximum value"
										class="select-none"
									>
										{getFieldMax(key)}
									</span>
								</div>

								{#if key === "responseTokens"}
									<div class="mt-2 flex items-center gap-2">
										<input
											type="checkbox"
											id="responseTokensUnlocked"
											bind:checked={
												sampling.responseTokensUnlocked
											}
											class="accent-primary"
										/>
										<label
											for="responseTokensUnlocked"
											class="text-sm"
										>
											Unlock max
										</label>
									</div>
								{:else if key === "contextTokens"}
									<div class="mt-2 flex items-center gap-2">
										<input
											type="checkbox"
											id="contextTokensUnlocked"
											bind:checked={
												sampling.contextTokensUnlocked
											}
											class="accent-primary"
										/>
										<label
											for="contextTokensUnlocked"
											class="text-sm"
										>
											Unlock max
										</label>
									</div>
								{/if}
							</div>
						{:else if meta?.type === "boolean"}
							<input
								type="checkbox"
								id={key}
								bind:checked={sampling[key]}
								class="accent-primary"
							/>
						{:else}
							<input
								type="text"
								id={key}
								bind:value={sampling[key]}
								class="input"
							/>
						{/if}
					</div>
				{/if}
			{/each}
		</form>
	{/if}
</div>

<SamplingConfigUnsavedChangesModal
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
	title="New Sampling Config"
	description="Your current settings will be copied."
/>
