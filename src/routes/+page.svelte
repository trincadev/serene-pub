<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import { getContext, onMount } from "svelte"
	import skio from "sveltekit-io"

	let userCtx: UserCtx = $state(getContext("userCtx"))
	let panelsCtx: PanelsCtx = $state(getContext("panelsCtx"))
	const socket = skio.get()

	// Data for lists
	let characters: Sockets.CharactersList.Response["charactersList"] = $state(
		[]
	)
	let personas: Sockets.PersonasList.Response["personasList"] = $state([])
	let chats: Sockets.ChatsList.Response["chatsList"] = $state([])

	// Listen for lists
	onMount(() => {
		socket.on("charactersList", (msg: Sockets.CharactersList.Response) => {
			characters = msg.charactersList || []
		})
		socket.on("personasList", (msg: Sockets.PersonasList.Response) => {
			personas = msg.personasList || []
		})
		socket.on("chatsList", (msg: Sockets.ChatsList.Response) => {
			chats = msg.chatsList || []
		})
		socket.emit("charactersList", {})
		socket.emit("personasList", {})
		socket.emit("chatsList", {})
	})

	function openSettings() {
		panelsCtx.openPanel("settings")
	}

	function openSamplingConfig() {
		panelsCtx.openPanel("sampling")
	}
	function openContextConfig() {
		panelsCtx.openPanel("context")
	}
	function openPromptConfig() {
		panelsCtx.openPanel("prompts")
	}
	function openConnections() {
		panelsCtx.openPanel("connections")
	}
	function openCharacters() {
		panelsCtx.openPanel("characters")
	}
	function openPersonas() {
		panelsCtx.openPanel("personas")
	}
	function openChats() {
		panelsCtx.openPanel("chats")
	}
</script>

<svelte:head>
	<title>Serene Pub - Get Started</title>
	<meta name="description" content="Serene Pub" />
</svelte:head>

<main class="flex flex-1 flex-col items-center justify-center px-2 md:px-0">
	<div
		class="bg-surface-200-800 mx-auto my-8 w-full max-w-2xl rounded-xl p-6 shadow-lg"
	>
		<h1 class="text-foreground mb-2 text-center text-3xl font-bold">
			Get Started with Serene Pub
		</h1>
		<p class="text-muted-foreground mb-6 text-center">
			Follow these steps to set up your environment and start chatting!
		</p>
		<ol class="flex list-none flex-col gap-6">
			<li class="flex items-start gap-2">
				<span>
					<Icons.Settings
						class="text-primary-600-400 mt-1"
						size={20}
					/>
				</span>
				<div>
					<b>Optional: Personalize Appearance</b>
					<br />
					<div class="my-2 flex items-center gap-2">
						<button
							class="btn btn-sm preset-filled-primary-500"
							onclick={openSettings}
						>
							<Icons.Settings size={16} /> Settings
						</button>
					</div>
				</div>
			</li>
			<li class="flex items-start gap-2">
				{#if userCtx.user?.activeSamplingConfig}
					<Icons.CheckCircle
						class="text-success-500 mt-1"
						size={20}
					/>
				{:else}
					<Icons.XCircle class="text-error-500 mt-1" size={20} />
				{/if}
				<div>
					<b>Sampling Configuration</b>
					<br />
					{#if userCtx.user?.activeSamplingConfig}
						<span class="text-success-500">
							Sampling config set: {userCtx.user
								.activeSamplingConfig.name}
						</span>
					{:else}
						<div class="my-2 flex items-center gap-2">
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={openSamplingConfig}
							>
								<Icons.Settings size={16} /> Set Sampling Config
							</button>
						</div>
					{/if}
				</div>
			</li>
			<li class="flex items-start gap-2">
				{#if userCtx.user?.activeContextConfig}
					<Icons.CheckCircle
						class="text-success-500 mt-1"
						size={20}
					/>
				{:else}
					<Icons.XCircle class="text-error-500 mt-1" size={20} />
				{/if}
				<div>
					<b>Context Configuration</b>
					<br />
					{#if userCtx.user?.activeContextConfig}
						<span class="text-success-500">
							Context config set: {userCtx.user
								.activeContextConfig.name}
						</span>
					{:else}
						<div class="my-2 flex items-center gap-2">
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={openContextConfig}
							>
								<Icons.Settings size={16} /> Set Context Config
							</button>
						</div>
					{/if}
				</div>
			</li>
			<li class="flex items-start gap-2">
				{#if userCtx.user?.activePromptConfig}
					<Icons.CheckCircle
						class="text-success-500 mt-1"
						size={20}
					/>
				{:else}
					<Icons.XCircle class="text-error-500 mt-1" size={20} />
				{/if}
				<div>
					<b>Prompt Configuration</b>
					<br />
					{#if userCtx.user?.activePromptConfig}
						<span class="text-success-500">
							Prompt config set: {userCtx.user.activePromptConfig
								.name}
						</span>
					{:else}
						<div class="text-primary-500">
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={openPromptConfig}
							>
								<Icons.Settings size={16} /> Set Prompt Config
							</button>
						</div>
					{/if}
				</div>
			</li>
			<li class="flex items-start gap-2">
				{#if userCtx.user?.activeConnection}
					<Icons.CheckCircle
						class="text-success-500 mt-1"
						size={20}
					/>
				{:else}
					<Icons.XCircle class="text-error-500 mt-1" size={20} />
				{/if}
				<div>
					<b>Connections</b>
					<br />
					{#if userCtx.user?.activeConnection}
						<span class="text-success-500">
							Connection set: {userCtx.user
								.activeConnection.name}
						</span>
					{:else}
						<div class="my-2 flex items-center gap-2">
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={openConnections}
							>
								<Icons.Cable size={16} /> Add Connection
							</button>
						</div>
					{/if}
				</div>
			</li>
			<li class="flex items-start gap-2">
				{#if characters.length > 0}
					<Icons.CheckCircle
						class="text-success-500 mt-1"
						size={20}
					/>
				{:else}
					<Icons.XCircle class="text-error-500 mt-1" size={20} />
				{/if}
				<div>
					<b>Add a Character</b>
					<br />
					{#if characters.length > 0}
						<span class="text-success-500">
							{characters.length} character(s) found.
						</span>
					{:else}
						<div class="my-2 flex items-center gap-2">
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={openCharacters}
							>
								<Icons.UserPlus size={16} /> Add Character
							</button>
						</div>
					{/if}
				</div>
			</li>
			<li class="flex items-start gap-2">
				{#if personas.length > 0}
					<Icons.CheckCircle
						class="text-success-500 mt-1"
						size={20}
					/>
				{:else}
					<Icons.XCircle class="text-error-500 mt-1" size={20} />
				{/if}
				<div>
					<b>Add a Persona</b>
					<br />
					{#if personas.length > 0}
						<span class="text-success-500">
							{personas.length} persona(s) found.
						</span>
					{:else}
						<div class="my-2 flex items-center gap-2">
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={openPersonas}
							>
								<Icons.UserPlus size={16} /> Add Persona
							</button>
						</div>
					{/if}
				</div>
			</li>
			<li class="flex items-start gap-2">
				{#if chats.length > 0}
					<Icons.CheckCircle
						class="text-success-500 mt-1"
						size={20}
					/>
				{:else}
					<Icons.XCircle class="text-error-500 mt-1" size={20} />
				{/if}
				<div>
					<b>Add a Chat</b>
					<br />
					{#if chats.length > 0}
						<span class="text-success-500">
							{chats.length} chat(s) found.
						</span>
					{:else}
						<div class="my-2 flex items-center gap-2">
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={openChats}
							>
								<Icons.MessageSquarePlus size={16} /> Add Chat
							</button>
						</div>
					{/if}
				</div>
			</li>
		</ol>
	</div>
</main>

<style>
	ol {
		margin-left: 1em;
	}
</style>
