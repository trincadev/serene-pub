<script lang="ts">
	// Mock data for demonstration
	let user = { username: "Warren" }
	let chats = [
		{ id: 1, name: "Warren & Desir", isGroup: false },
		{ id: 2, name: "Eldoria Tavern", isGroup: true }
	]
	let personas = [
		{ id: 1, name: "Warren", avatar: "/images/user-default.png" },
		{ id: 2, name: "Master Desir", avatar: "/images/1747379438925-Ryvn.png" }
	]
	let characters = [
		{ id: 1, name: "Natsumi", avatar: "/images/natsumi.png" },
		{ id: 2, name: "Firras", avatar: "/images/firras.png" }
	]
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Serene Pub" />
</svelte:head>

<main class="flex-1 flex flex-col items-center justify-center px-2 md:px-0">
	<div class="w-full max-w-2xl mx-auto my-8 bg-surface-200-800 rounded-xl shadow-lg p-6">
		<h1 class="text-3xl font-bold mb-2 text-center text-foreground">Welcome to Serene Pub</h1>
		<p class="text-center text-muted-foreground mb-6">Your collaborative LLM roleplay and chat hub. Select a chat or open a drawer to get started.</p>
		<div class="flex flex-col gap-4">
			<div>
				<h2 class="font-semibold text-lg mb-1 text-foreground">Recent Chats</h2>
				<ul class="divide-y divide-border">
					{#each chats as chat}
						<li class="py-2 flex items-center gap-2">
							<span class="inline-block w-2 h-2 rounded-full {chat.isGroup ? 'bg-primary' : 'bg-success'}"></span>
							<span class="font-medium text-foreground">{chat.name}</span>
						</li>
					{/each}
				</ul>
			</div>
			<div class="flex gap-4 justify-center">
				<button class="btn preset-filled-primary-500" onclick={() => {/* openDrawer('right','personas') */}}>Personas</button>
				<button class="btn preset-filled-primary-500" onclick={() => {/* openDrawer('right','characters') */}}>Characters</button>
				<button class="btn preset-filled-primary-500" onclick={() => {/* openDrawer('left','lorebooks') */}}>Lorebooks</button>
			</div>
		</div>
	</div>
</main>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}

	.welcome img {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		display: block;
	}
</style>
