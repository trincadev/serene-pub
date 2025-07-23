<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import * as skio from "sveltekit-io"
	import { onDestroy, onMount } from "svelte"
	import { z } from "zod"
	import PersonaUnsavedChangesModal from "../modals/PersonaUnsavedChangesModal.svelte"
	import Avatar from "../Avatar.svelte"

	interface EditPersonaData {
		id?: number
		name: string
		avatar: string
		description: string
		isDefault?: boolean
		position?: number
		connections?: string
		_avatarFile?: File | undefined
		_avatar?: string
	}

	// Zod validation schema
	const personaSchema = z.object({
		name: z.string().min(1, "Name is required").trim(),
		description: z.string().min(1, "Description is required").trim(),
		avatar: z.string().optional(),
		isDefault: z.boolean().optional(),
		position: z.number().optional(),
		connections: z.string().optional()
	})

	type ValidationErrors = Record<string, string>

	export interface Props {
		personaId?: number
		isSafeToClose: boolean
		closeForm: () => void
		onCancel?: () => void
	}

	let {
		personaId,
		isSafeToClose: hasChanges = $bindable(),
		closeForm = $bindable(),
		onCancel = $bindable()
	}: Props = $props()

	const socket = skio.get()

	let editPersonaData: EditPersonaData = $state({
		id: undefined,
		name: "",
		avatar: "",
		description: "",
		isDefault: false,
		position: 0,
		connections: "",
		_avatarFile: undefined,
		_avatar: ""
	})
	let originalPersonaData: EditPersonaData = $state({
		id: undefined,
		name: "",
		avatar: "",
		description: "",
		isDefault: false,
		position: 0,
		connections: "",
		_avatarFile: undefined,
		_avatar: ""
	})
	let showCancelModal = $state(false)
	let validationErrors: ValidationErrors = $state({})
	let formContainer: HTMLDivElement
	let validationTimeout: NodeJS.Timeout

	let mode: "create" | "edit" = $derived.by(() =>
		!!editPersonaData.id ? "edit" : "create"
	)

	// Events: avatarChange, save, cancel
	function validateFormDebounced() {
		clearTimeout(validationTimeout)
		validationTimeout = setTimeout(() => {
			validateForm()
		}, 300) // 300ms debounce
	}

	function validateForm(): boolean {
		const result = personaSchema.safeParse(editPersonaData)

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

	function handleAvatarChange(e: Event) {
		const input = e.target as HTMLInputElement | null
		if (!input || !input.files || input.files.length === 0) return
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return
		// Only set preview, do not upload yet
		const previewReader = new FileReader()
		previewReader.onload = (ev2) => {
			editPersonaData._avatar = ev2.target?.result as string
		}
		previewReader.readAsDataURL(file)
		// Store file for later upload
		editPersonaData._avatarFile = file
	}

	function onSave() {
		// Validate the form first
		if (!validateForm()) {
			// Validation failed, errors are already set in validationErrors
			return
		}

		if (mode === "create") {
			handleCreate()
		} else if (mode === "edit" && editPersonaData.id) {
			handleUpdate()
		}
	}

	function handleCreate() {
		const newPersona = { ...editPersonaData }
		const avatarFile = newPersona._avatarFile
		delete newPersona._avatarFile
		delete newPersona._avatar
		socket.emit("createPersona", {
			persona: newPersona,
			avatarFile
		})
	}

	function handleUpdate() {
		const updatedPersona = { ...editPersonaData }
		const avatarFile = updatedPersona._avatarFile
		delete updatedPersona._avatarFile
		delete updatedPersona._avatar
		socket.emit("updatePersona", {
			persona: updatedPersona,
			avatarFile
		})
	}

	function handleCancelModalOnOpenChange(e: { open: boolean }) {
		if (!e.open) {
			showCancelModal = false
		}
	}

	function handleCancel() {
		if (hasChanges) {
			showCancelModal = true
		} else {
			closeForm()
		}
	}

	function handleCancelModalDiscard() {
		showCancelModal = false
		closeForm()
	}

	function handleCancelModalCancel() {
		showCancelModal = false
	}

	function handleKeydown(e: KeyboardEvent) {
		// Only handle shortcuts if this form is focused or contains the active element
		if (!formContainer?.contains(document.activeElement)) return

		// Ctrl+S / Cmd+S to save
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault()
			onSave()
		}
		// Escape to cancel
		else if (e.key === "Escape") {
			e.preventDefault()
			handleCancel()
		}
	}

	// Add debounced validation effect
	$effect(() => {
		// Only validate if we have some data and it's not the initial empty state
		if (
			editPersonaData.name ||
			editPersonaData.description ||
			Object.keys(validationErrors).length > 0
		) {
			validateFormDebounced()
		}
	})

	$effect(() => {
		hasChanges =
			JSON.stringify(editPersonaData) !==
			JSON.stringify(originalPersonaData)
	})

	onMount(() => {
		onCancel = handleCancel

		// Add keyboard event listener
		document.addEventListener("keydown", handleKeydown)

		socket.on("createPersona", (res: Sockets.CreatePersona.Response) => {
			if (!res.error) {
				validationErrors = {} // Clear any validation errors on success
				closeForm()
			}
		})

		socket.on("updatePersona", (res: Sockets.UpdatePersona.Response) => {
			if (!res.error) {
				validationErrors = {} // Clear any validation errors on success
				closeForm()
			}
		})

		if (personaId) {
			socket.once("persona", (message: Sockets.Persona.Response) => {
				if (message.persona) {
					const personaData = { ...message.persona }
					editPersonaData = {
						...editPersonaData,
						...personaData,
						avatar: personaData.avatar ?? "",
						description: personaData.description ?? "",
						_avatar: ""
					}
					originalPersonaData = { ...editPersonaData }
				}
			})
			socket.emit("persona", { id: personaId })
		}
	})

	onDestroy(() => {
		socket.off("createPersona")
		socket.off("updatePersona")
		socket.off("persona")

		// Remove keyboard event listener and clear timeout
		document.removeEventListener("keydown", handleKeydown)
		clearTimeout(validationTimeout)
	})
</script>

<div
	class="h-full rounded-lg"
	bind:this={formContainer}
	role="dialog"
	aria-labelledby="form-title"
	aria-modal="false"
>
	<h1 class="mb-4 text-lg font-bold" id="form-title">
		{mode === "edit"
			? `Edit: ${editPersonaData.name || "Persona"}`
			: "Create Persona"}
	</h1>
	<div class="mt-4 mb-4 flex gap-2" role="group" aria-label="Form actions">
		<button
			type="button"
			class="btn btn-sm preset-filled-surface-500 w-full"
			onclick={handleCancel}
			aria-describedby="form-title"
		>
			Cancel
		</button>
		<button
			type="button"
			class="btn btn-sm preset-filled-success-500 w-full"
			class:preset-filled-success-500={hasChanges}
			class:preset-tonal-success={!hasChanges}
			onclick={onSave}
			aria-describedby="form-title"
			aria-label={`${mode === "edit" ? "Update" : "Create"} persona${hasChanges ? " (has unsaved changes)" : ""}`}
		>
			<Icons.Save size={16} aria-hidden="true" />
			{mode === "edit" ? "Update" : "Create"}
		</button>
	</div>
	<div class="flex flex-col gap-4" role="form" aria-labelledby="form-title">
		<fieldset
			class="flex items-center gap-4"
			aria-labelledby="avatar-section"
		>
			<legend id="avatar-section" class="sr-only">Avatar Settings</legend>
			<div aria-label="Current avatar preview">
				<Avatar
					src={editPersonaData._avatar || editPersonaData.avatar}
					char={editPersonaData}
				/>
			</div>
			<div class="flex w-full flex-col gap-2">
				<div class="flex w-full items-center justify-center">
					<label
						for="dropzone-file"
						class="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-800"
						aria-describedby="avatar-help"
					>
						<div
							class="flex w-full flex-col items-center justify-center"
						>
							<svg
								class="my-4 h-8 w-8 text-gray-500 dark:text-gray-400"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 20 16"
							>
								<path
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
								/>
							</svg>
						</div>
						<input
							id="dropzone-file"
							type="file"
							class="hidden"
							accept="image/*"
							onchange={handleAvatarChange}
							aria-describedby="avatar-help"
						/>
						<div id="avatar-help" class="sr-only">
							Upload an image file for the persona avatar.
							Supported formats: JPG, PNG, GIF
						</div>
					</label>
				</div>
				<button
					type="button"
					class="btn btn-sm preset-tonal-error mt-1"
					onclick={() => {
						editPersonaData._avatarFile = undefined
						editPersonaData._avatar = ""
					}}
					disabled={!editPersonaData._avatarFile}
					aria-label="Clear selected avatar image"
				>
					Clear Selection
				</button>
			</div>
		</fieldset>
		<fieldset class="flex flex-col gap-1">
			<label class="flex gap-1 font-semibold" for="personaName">
				Name* <span
					class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
					title="This field will be visible in prompts"
					aria-label="This field will be visible in prompts"
				>
					<Icons.ScanEye
						size={16}
						class="relative top-[1px] inline"
						aria-hidden="true"
					/>
				</span>
			</label>
			<input
				id="personaName"
				type="text"
				bind:value={editPersonaData.name}
				class="input {validationErrors.name
					? 'border-red-500 focus:border-red-500'
					: ''}"
				oninput={() => {
					// Clear validation error when user starts typing
					if (validationErrors.name) {
						const { name, ...rest } = validationErrors
						validationErrors = rest
					}
				}}
				aria-required="true"
				aria-invalid={validationErrors.name ? "true" : "false"}
				aria-describedby={validationErrors.name
					? "name-error"
					: undefined}
			/>
			{#if validationErrors.name}
				<p
					class="mt-1 text-sm text-red-500"
					id="name-error"
					role="alert"
				>
					{validationErrors.name}
				</p>
			{/if}
		</fieldset>
		<fieldset class="flex flex-col gap-2">
			<label class="flex gap-1 font-semibold" for="personaDescription">
				Description* <span
					class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
					title="This field will be visible in prompts"
					aria-label="This field will be visible in prompts"
				>
					<Icons.ScanEye
						size={16}
						class="relative top-[1px] inline"
						aria-hidden="true"
					/>
				</span>
			</label>
			<textarea
				id="personaDescription"
				rows="8"
				bind:value={editPersonaData.description}
				class="input {validationErrors.description
					? 'border-red-500 focus:border-red-500'
					: ''}"
				placeholder="Description..."
				aria-label="Persona description"
				aria-required="true"
				aria-invalid={validationErrors.description ? "true" : "false"}
				aria-describedby={validationErrors.description
					? "description-error"
					: undefined}
				oninput={() => {
					// Clear validation error when user starts typing
					if (validationErrors.description) {
						const { description, ...rest } = validationErrors
						validationErrors = rest
					}
				}}
			></textarea>
			{#if validationErrors.description}
				<p
					class="mt-1 text-sm text-red-500"
					id="description-error"
					role="alert"
				>
					{validationErrors.description}
				</p>
			{/if}
		</fieldset>
	</div>
</div>

<PersonaUnsavedChangesModal
	open={showCancelModal}
	onOpenChange={handleCancelModalOnOpenChange}
	onConfirm={handleCancelModalDiscard}
	onCancel={handleCancelModalCancel}
/>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
