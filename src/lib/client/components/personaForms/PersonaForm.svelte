<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import * as skio from "sveltekit-io"
	import { onDestroy, onMount } from "svelte"
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
	}

	export interface Props {
		personaId?: number
		isSafeToClose: boolean
		closeForm: () => void
		onCancel?: () => void
	}

	let {
		personaId,
		isSafeToClose = $bindable(),
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
		_avatarFile: undefined
	})
	let originalPersonaData: EditPersonaData = $state({ ...editPersonaData })
	let showUnsavedChangesModal = $state(false)
	let confirmCloseFormResolve: ((v: boolean) => void) | null = null

	let mode: "create" | "edit" = $derived.by(() =>
		!!editPersonaData.id ? "edit" : "create"
	)
	let isDataValid = $derived(!!editPersonaData?.name?.trim())

	$effect(() => {
		isSafeToClose =
			JSON.stringify(editPersonaData) ===
			JSON.stringify(originalPersonaData)
	})

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
		socket.emit("createPersona", {
			persona: newPersona,
			avatarFile
		})
	}

	function handleUpdate() {
		const updatedPersona = { ...editPersonaData }
		const avatarFile = updatedPersona._avatarFile
		delete updatedPersona._avatarFile
		socket.emit("updatePersona", {
			persona: updatedPersona,
			avatarFile
		})
	}

	async function closeFormWithCheck() {
		if (!isSafeToClose) {
			showUnsavedChangesModal = true
			return new Promise<boolean>((resolve) => {
				confirmCloseFormResolve = resolve
			})
		} else {
			closeForm()
			return true
		}
	}

	function handleUnsavedChangesOnOpenChange(e: { open: boolean }) {
		if (!e.open) {
			showUnsavedChangesModal = false
			if (confirmCloseFormResolve) confirmCloseFormResolve(false)
		}
	}

	function handleCloseModalDiscard() {
		showUnsavedChangesModal = false
		isSafeToClose = true
		if (confirmCloseFormResolve) confirmCloseFormResolve(true)
		closeForm()
	}

	function handleCloseModalCancel() {
		showUnsavedChangesModal = false
		if (confirmCloseFormResolve) confirmCloseFormResolve(false)
	}

	function handleCancel() {
		closeFormWithCheck()
	}

	onMount(() => {
		onCancel = handleCancel
		socket.on("createPersona", (res: Sockets.CreatePersona.Response) => {
			isSafeToClose = true
			closeForm()
		})

		socket.on("updatePersona", (res: Sockets.UpdatePersona.Response) => {
			isSafeToClose = true
			closeForm()
		})
		if (personaId) {
			socket.once("persona", (message: Sockets.Persona.Response) => {
				if (message.persona) {
					Object.assign(editPersonaData, message.persona)
					Object.assign(originalPersonaData, message.persona)
				}
			})
			socket.emit("persona", { id: personaId })
		}
	})
</script>

<div
	class="bg-background animate-fade-in border-surface-500/25 h-full rounded-lg border p-2 shadow-lg"
>
	<h2 class="mb-4 text-lg font-bold">
		{mode === "edit" ? `Edit: ${editPersonaData.name}` : "Create Persona"}
	</h2>
	<div class="mt-4 mb-4 flex gap-2">
		<button
			type="button"
			class="btn btn-sm preset-filled-surface-500 w-full"
			onclick={handleCancel}
		>
			Cancel
		</button>
		<button
			type="button"
			class="btn btn-sm preset-filled-success-500 w-full"
			onclick={onSave}
			disabled={!isDataValid || isSafeToClose}
		>
			<Icons.Save size={16} />
			{mode === "edit" ? "Update" : "Create"}
		</button>
	</div>
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-4">
			<span>
				<Avatar
					src={editPersonaData._avatar || editPersonaData.avatar}
					char={editPersonaData}
				/>
			</span>
			<div class="flex w-full flex-col gap-2">
				<div class="flex w-full items-center justify-center">
					<label
						for="dropzone-file"
						class="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600 dark:hover:bg-gray-800"
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
						/>
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
				>
					Clear Selection
				</button>
			</div>
		</div>
		<div class="flex flex-col gap-1">
			<label class="flex gap-1 font-semibold" for="personaName">
				Name* <span
					class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
					title="This field will be visible in prompts"
				>
					<Icons.ScanEye
						size={16}
						class="relative top-[1px] inline"
					/>
				</span>
			</label>
			<input
				id="personaName"
				type="text"
				bind:value={editPersonaData.name}
				class="input"
			/>
		</div>
		<div class="flex flex-col gap-2">
			<label class="flex gap-1 font-semibold" for="personaDescription">
				Description <span
					class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
					title="This field will be visible in prompts"
				>
					<Icons.ScanEye
						size={16}
						class="relative top-[1px] inline"
					/>
				</span>
			</label>
			<textarea
				id="personaDescription"
				rows="3"
				bind:value={editPersonaData.description}
				class="input"
				placeholder="Description..."
			></textarea>
		</div>
	</div>
</div>

<PersonaUnsavedChangesModal
	open={showUnsavedChangesModal}
	onOpenChange={handleUnsavedChangesOnOpenChange}
	onConfirm={handleCloseModalDiscard}
	onCancel={handleCloseModalCancel}
/>
