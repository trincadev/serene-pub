<script lang="ts">
	import { PromptFormats } from "$lib/shared/constants/PromptFormats"
	import { TokenCounterOptions } from "$lib/shared/constants/TokenCounters"
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { onMount, onDestroy } from "svelte"
	import * as skio from "sveltekit-io"

	interface ExtraFieldData {
		stream: boolean
		raw: boolean
		think: boolean
		keepAliveNumber: number
		keepAliveUnit: string
		useChat: boolean
	}

	interface ExtraJson {
		stream?: boolean
		raw?: boolean
		think?: boolean
		keepAlive?: string
		useChat?: boolean
	}

	interface Props {
		connection: SelectConnection
	}

	let { connection = $bindable() } = $props()

	const socket = skio.get()
	const defaultExtraJson = {
		stream: false,
		raw: false,
		think: false,
		keepAlive: "300ms",
		useChat: true
	}

	let availableOllamaModels: Sockets.RefreshModels.Response["models"] =
		$state([])
	let ollamaFields: ExtraFieldData | undefined = $state()

	socket.on("refreshModels", (msg: Sockets.RefreshModels.Response) => {
		if (msg.models) availableOllamaModels = msg.models
	})

	socket.on("testConnection", (msg: Sockets.TestConnection.Response) => {
		testResult = msg
	})

	function handleRefreshModels() {
		socket.emit("refreshModels", {
			connection
		} as Sockets.RefreshModels.Call)
	}

	let testResult: { ok: boolean; error?: string; models?: any[] } | null =
		$state(null)

	function handleTestConnection() {
		testResult = null
		socket.emit("testConnection", {
			connection
		} as Sockets.TestConnection.Call)
	}

	// let isValid = $derived.by(() => {
	// 	return (
	// 		connection &&
	// 		connection.type === "ollama" &&
	// 		connection.baseUrl &&
	// 		connection.model
	// 	)
	// })

	function extraJsonToExtraFields(extraJson: ExtraJson): ExtraFieldData {
		return {
			stream: extraJson.stream || false,
			raw: extraJson.raw || false,
			think: extraJson.think || false,
			useChat: extraJson.useChat || true,
			keepAliveNumber: extraJson.keepAlive
				? parseInt(extraJson.keepAlive) || 300
				: 300,
			keepAliveUnit: extraJson.keepAlive
				? extraJson.keepAlive.replace(/^[0-9]+/, "")
				: "ms"
		}
	}

	function extraFieldsToExtraJson(fields: ExtraFieldData): ExtraJson {
		return {
			stream: fields.stream,
			raw: fields.raw,
			think: fields.think,
			keepAlive: `${fields.keepAliveNumber}${fields.keepAliveUnit}`,
			useChat: fields.useChat || true
		}
	}

	$effect(() => {
		const _ollamaFields = ollamaFields
		if (_ollamaFields) {
			connection.extraJson = extraFieldsToExtraJson(_ollamaFields)
		}
	})

	onMount(() => {
		if (connection.extraJson) {
			const extraJson = { ...defaultExtraJson, ...connection.extraJson }
			ollamaFields = extraJsonToExtraFields(extraJson)
		} else {
			ollamaFields = extraJsonToExtraFields(defaultExtraJson)
		}
		handleRefreshModels()
	})

	onDestroy(() => {
		socket.off("refreshModels")
		socket.off("testConnection")
	})
</script>

{#if connection}
	<div class="mt-2 flex flex-col gap-1">
		<label class="font-semibold" for="model">Model</label>
		<select
			id="model"
			bind:value={connection.model}
			class="select bg-background border-muted w-full rounded border"
		>
			<option value="">-- Select Model --</option>
			{#each availableOllamaModels as m}
				<option value={m.model}>{m.name}</option>
			{/each}
		</select>
	</div>
	<div class="mt-4 flex gap-2">
		<button
			type="button"
			class="btn btn-sm preset-tonal-primary w-full"
			onclick={handleRefreshModels}
		>
			Refresh Models
		</button>
		<button
			type="button"
			class="btn preset-tonal-success btn-sm w-full"
			onclick={handleTestConnection}
		>
			{#if testResult?.ok === true}
				Test: Okay!
			{:else if testResult?.ok === false}
				Test: Failed!
			{:else}
				Test Connection
			{/if}
		</button>
	</div>
	{#if !ollamaFields?.useChat}
		<div class="mt-2 flex flex-col gap-1">
			<label class="font-semibold" for="promptFormat">
				Prompt Format
			</label>
			<select
				id="promptFormat"
				class="select bg-background border-muted w-full rounded border"
				bind:value={connection.promptFormat}
			>
				{#each PromptFormats.options as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	{/if}
	<div class="mt-2 flex flex-col gap-1">
		<label class="font-semibold" for="tokenCounter">Token Counter</label>
		<select
			id="tokenCounter"
			bind:value={connection.tokenCounter}
			class="select bg-background border-muted w-full rounded border"
		>
			{#each TokenCounterOptions.options as t}
				<option value={t.value}>{t.label}</option>
			{/each}
		</select>
	</div>
	<details class="mt-4">
		<summary class="cursor-pointer font-semibold">
			Advanced Settings
		</summary>
		<div class="mt-2 flex flex-col gap-1">
			<label class="font-semibold" for="baseUrl">Base URL</label>
			<input
				id="baseUrl"
				type="text"
				bind:value={connection.baseUrl}
				placeholder="http://localhost:11434/"
				required
				class="input"
			/>
		</div>
		{#if ollamaFields}
			<div class="mt-2 flex flex-col gap-1">
				<label class="font-semibold" for="keepAlive">Keep Alive</label>
				<div class="flex items-center gap-2">
					<input
						id="keepAliveNumber"
						type="number"
						min="0"
						bind:value={ollamaFields.keepAliveNumber}
						class="input bg-background border-muted w-32 rounded border"
					/>
					<select
						id="keepAliveUnit"
						bind:value={ollamaFields.keepAliveUnit}
						class="select bg-background border-muted w-24 rounded border"
					>
						<option value="ms">ms</option>
						<option value="s">s</option>
						<option value="m">m</option>
						<option value="h">h</option>
					</select>
				</div>
			</div>
			<section class="w-full space-y-4 pt-4">
				<div class="flex items-center justify-between gap-4">
					<label class="font-semibold" for="useChat">
						Use Chat Mode
					</label>
					<Switch
						name="useChat"
						checked={ollamaFields.useChat}
						onCheckedChange={(e) =>
							(ollamaFields!.useChat = e.checked)}
					/>
				</div>
				<div class="flex items-center justify-between gap-4">
					<label class="font-semibold" for="stream">Stream</label>
					<Switch
						name="stream"
						checked={ollamaFields.stream}
						onCheckedChange={(e) =>
							(ollamaFields!.stream = e.checked)}
					/>
				</div>
				<div class="flex items-center justify-between gap-4">
					<label class="font-semibold" for="think">Think</label>
					<Switch
						name="think"
						checked={ollamaFields.think}
						onCheckedChange={(e) =>
							(ollamaFields!.think = e.checked)}
					/>
				</div>
			</section>
		{/if}
	</details>
{/if}
