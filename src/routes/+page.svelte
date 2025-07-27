<script lang="ts">
	import Avatar from "$lib/client/components/Avatar.svelte"
	import SidebarListItem from "$lib/client/components/SidebarListItem.svelte"
	import * as Icons from "@lucide/svelte"
	import { getContext, onMount, onDestroy } from "svelte"
	import * as skio from "sveltekit-io"

	let userCtx: UserCtx = $state(getContext("userCtx"))
	let panelsCtx: PanelsCtx = $state(getContext("panelsCtx"))
	let themeCtx: ThemeCtx = $state(getContext("themeCtx"))

	const socket = skio.get()

	// Data for lists
	let characters: Sockets.CharacterList.Response["characterList"] = $state([])
	let personas: Sockets.PersonaList.Response["personaList"] = $state([])
	let chats: Sockets.ChatsList.Response["chatsList"] = $state([])

	let isSetup = $derived.by(() => {
		return (
			userCtx.user?.activeSamplingConfig &&
			userCtx.user?.activeContextConfig &&
			userCtx.user?.activePromptConfig &&
			userCtx.user?.activeConnection &&
			characters.length > 0 &&
			personas.length > 0 &&
			chats.length > 0
		)
	})

	function openSettings() {
		panelsCtx.openPanel({ key: "settings" })
	}

	function openSamplingConfig() {
		panelsCtx.openPanel({ key: "sampling" })
	}
	function openContextConfig() {
		panelsCtx.openPanel({ key: "context" })
	}
	function openPromptConfig() {
		panelsCtx.openPanel({ key: "prompts" })
	}
	function openConnections() {
		panelsCtx.openPanel({ key: "connections" })
	}
	function openCharacters() {
		panelsCtx.openPanel({ key: "characters" })
	}
	function openPersonas() {
		panelsCtx.openPanel({ key: "personas" })
	}
	function openChats() {
		panelsCtx.openPanel({ key: "chats" })
	}

	// Listen for lists
	onMount(() => {
		socket.on("characterList", (msg: Sockets.CharacterList.Response) => {
			characters = msg.characterList || []
		})
		socket.on("personaList", (msg: Sockets.PersonaList.Response) => {
			personas = msg.personaList || []
		})
		socket.on("chatsList", (msg: Sockets.ChatsList.Response) => {
			chats = msg.chatsList || []
		})
		socket.emit("characterList", {})
		socket.emit("personaList", {})
		socket.emit("chatsList", {})
	})

	onDestroy(() => {
		socket.off("characterList")
		socket.off("personaList")
		socket.off("chatsList")
	})
</script>

<svelte:head>
	<title>Serene Pub - Get Started</title>
	<meta name="description" content="Serene Pub" />
</svelte:head>

<div
	class="flex flex-1 flex-col items-center justify-center gap-4 px-2 md:px-0"
>
	<img
		src={themeCtx.mode === "dark"
			? "logo-w-text-dark.png"
			: "logo-w-text.png"}
		alt="Serene Pub Logo"
		class="bg-primary-500/25 w-full rounded-xl"
	/>

	<!-- Alpha disclaimer card below the logo -->
	<div
		class="preset-filled-warning-100-900 mx-auto w-full rounded-lg p-2 text-center text-sm"
	>
		<strong>Serene Pub is in alpha!</strong>
		Expect bugs and rapid changes. This project is under heavy development.
	</div>

	{#if !isSetup}
		<div
			class="preset-filled-surface-200-800 mx-auto w-full rounded-xl p-6"
		>
			<h1 class="text-foreground mb-2 text-center text-3xl font-bold">
				Get Started with Serene Pub
			</h1>
			<p class="text-muted-foreground mb-6 text-center">
				Follow these steps to set up your environment and start
				chatting!
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
								Prompt config set: {userCtx.user
									.activePromptConfig.name}
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
								Connection set: {userCtx.user.activeConnection
									.name}
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
	{/if}

	{#if isSetup}
		<div
			class="preset-filled-surface-200-800 mx-auto w-full rounded-xl p-6"
		>
			<h1 class="text-foreground mb-2 text-center text-3xl font-bold">
				You're All Set!
			</h1>
			<p class="text-muted-foreground mb-6 text-center">
				You can now start chatting with your characters.
			</p>
			<div class="flex justify-center">
				<button
					class="btn preset-filled-primary-500"
					onclick={() =>
						panelsCtx.openPanel({ key: "chats", toggle: false })}
					disabled={panelsCtx.rightPanel == "chats"}
				>
					Start Chatting
				</button>
			</div>
		</div>

		<div class="w-full">
			<h3 class="w-full text-xl">Characters</h3>
			<div class="grid grid-cols-1 justify-between gap-2 lg:grid-cols-2">
				<!-- <div class="card preset-filled-surface-200-800 p-2">
					tEST
				</div> -->
				{#each characters as character (character.id)}
					<SidebarListItem
						onclick={() => {
							panelsCtx.digest.chatCharacterId = character.id
							panelsCtx.openPanel({
								key: "chats",
								toggle: false
							})
						}}
						contentTitle="Go to character chats"
						classes="!preset-filled-surface-200-800 transition-colors hover:!preset-filled-surface-300-700"
					>
						{#snippet content()}
							<div class="flex gap-2">
								<div
									class="h-[4em] min-h-[4em] w-[4em] min-w-[4em]"
								>
									<Avatar char={character} />
								</div>
								<div class="gap2 flex flex-col">
									<div
										class="text-foreground text-left font-semibold"
									>
										{character.nickname ||
											character.name ||
											"Unknown"}
									</div>
									<div
										class="text-muted-foreground line-clamp-2 text-sm"
									>
										{character.description ||
											"No description"}
									</div>
								</div>
							</div>
						{/snippet}
					</SidebarListItem>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference "tailwindcss";
	ol {
		margin-left: 1em;
	}
</style>
