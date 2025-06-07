<script lang="ts">
    import skio from "sveltekit-io"
    import { getContext, onMount, tick } from "svelte"
    import * as Icons from "@lucide/svelte"
    import WeightsUnsavedChangesModal from "../modals/PromptConfigUnsavedChangesModal.svelte"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    let userCtx: {user: SelectUser} = getContext("user")

    const socket = skio.get()

    let weights: SelectWeights | undefined = $state()
    let originalWeights: SelectWeights | undefined = $state()
    let unsavedChanges = $derived.by(() => {
        if (!weights || !originalWeights) return false
        // Compare current weights with original to detect changes
        return JSON.stringify(weights) !== JSON.stringify(originalWeights)
    })
    let showSelectWeights = $state(false)
    let showUnsavedChangesModal = $state(false)
    let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null
    let editingField: string | null = $state(null)

    socket.on("weights", (message: Sockets.Weights.Response) => {
        weights = { ...message.weights }
        originalWeights = { ...message.weights }
    })

    socket.on("weightsList", (message: Sockets.WeightsList.Response) => {
        weightsList = message.weightsList
    })

    socket.emit("weights", { id: userCtx.user.activeWeightsId })
    socket.emit("weightsList", {})

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
        temperature: { label: "Temperature", type: "number", min: 0, max: 2, step: 0.01 },
        topP: { label: "Top P", type: "number", min: 0, max: 1, step: 0.01 },
        topK: { label: "Top K", type: "number", min: 0, max: 200, step: 1 },
        repetitionPenalty: {
            label: "Repetition Penalty",
            type: "number",
            min: 0.5,
            max: 2,
            step: 0.01
        },
        minP: { label: "Min P", type: "number", min: 0, max: 1, step: 0.01 },
        tfs: { label: "TFS", type: "number", min: 0, max: 1, step: 0.01 },
        typicalP: { label: "Typical P", type: "number", min: 0, max: 1, step: 0.01 },
        mirostat: { label: "Mirostat", type: "number", min: 0, max: 2, step: 1 },
        mirostatTau: { label: "Mirostat Tau", type: "number", min: 0, max: 10, step: 0.01 },
        mirostatEta: { label: "Mirostat Eta", type: "number", min: 0, max: 1, step: 0.01 },
        penaltyAlpha: { label: "Penalty Alpha", type: "number", min: 0, max: 2, step: 0.01 },
        frequencyPenalty: {
            label: "Frequency Penalty",
            type: "number",
            min: 0,
            max: 2,
            step: 0.01
        },
        presencePenalty: { label: "Presence Penalty", type: "number", min: 0, max: 2, step: 0.01 },
        noRepeatNgramSize: {
            label: "No Repeat Ngram Size",
            type: "number",
            min: 0,
            max: 10,
            step: 1
        },
        numBeams: { label: "Num Beams", type: "number", min: 1, max: 10, step: 1 },
        lengthPenalty: { label: "Length Penalty", type: "number", min: 0, max: 2, step: 0.01 },
        minLength: { label: "Min Length", type: "number", min: 0, max: 1024, step: 1 },
        encoderRepetitionPenalty: {
            label: "Encoder Repetition Penalty",
            type: "number",
            min: 0,
            max: 2,
            step: 0.01
        },
        freqPen: { label: "Freq Pen", type: "number", min: 0, max: 2, step: 0.01 },
        presencePen: { label: "Presence Pen", type: "number", min: 0, max: 2, step: 0.01 },
        skew: { label: "Skew", type: "number", min: -2, max: 2, step: 0.01 },
        minTemp: { label: "Min Temp", type: "number", min: 0, max: 2, step: 0.01 },
        maxTemp: { label: "Max Temp", type: "number", min: 0, max: 2, step: 0.01 },
        dynatempExponent: {
            label: "Dynatemp Exponent",
            type: "number",
            min: 0,
            max: 2,
            step: 0.01
        },
        smoothingFactor: { label: "Smoothing Factor", type: "number", min: 0, max: 1, step: 0.01 },
        smoothingCurve: { label: "Smoothing Curve", type: "number", min: 0, max: 2, step: 0.01 },
        dryAllowedLength: { label: "Dry Allowed Length", type: "number", min: 0, max: 10, step: 1 },
        dryMultiplier: { label: "Dry Multiplier", type: "number", min: 0, max: 2, step: 0.01 },
        dryBase: { label: "Dry Base", type: "number", min: 0, max: 2, step: 0.01 },
        dryPenaltyLastN: { label: "Dry Penalty Last N", type: "number", min: 0, max: 10, step: 1 },
        maxTokensSecond: {
            label: "Max Tokens/Second",
            type: "number",
            min: 0,
            max: 10000,
            step: 1
        },
        seed: { label: "Seed", type: "number", min: -1, max: 999999, step: 1 },
        mirostatMode: { label: "Mirostat Mode", type: "number", min: 0, max: 2, step: 1 },
        xtcThreshold: { label: "XTC Threshold", type: "number", min: 0, max: 1, step: 0.01 },
        xtcProbability: { label: "XTC Probability", type: "number", min: 0, max: 1, step: 0.01 },
        nsigma: { label: "N Sigma", type: "number", min: 0, max: 10, step: 0.01 },
        speculativeNgram: { label: "Speculative Ngram", type: "number", min: 0, max: 10, step: 1 },
        guidanceScale: { label: "Guidance Scale", type: "number", min: 0, max: 20, step: 0.01 },
        etaCutoff: { label: "Eta Cutoff", type: "number", min: 0, max: 1, step: 0.01 },
        epsilonCutoff: { label: "Epsilon Cutoff", type: "number", min: 0, max: 1, step: 0.01 },
        repPenRange: { label: "Rep Pen Range", type: "number", min: 0, max: 100, step: 1 },
        repPenDecay: { label: "Rep Pen Decay", type: "number", min: 0, max: 1, step: 0.01 },
        repPenSlope: { label: "Rep Pen Slope", type: "number", min: 0, max: 2, step: 0.01 },
        logitBias: { label: "Logit Bias", type: "string" },
        bannedTokens: { label: "Banned Tokens", type: "string" },
        // Boolean fields (checkboxes)
        doSample: { label: "Do Sample", type: "boolean" },
        addBosToken: { label: "Add BOS Token", type: "boolean" },
        banEosToken: { label: "Ban EOS Token", type: "boolean" },
        skipSpecialTokens: { label: "Skip Special Tokens", type: "boolean" },
        includeReasoning: { label: "Include Reasoning", type: "boolean" },
        streaming: { label: "Streaming", type: "boolean" },
        earlyStopping: { label: "Early Stopping", type: "boolean" },
        dynatemp: { label: "Dynatemp", type: "boolean" }
    }

    // Helper: Show field if enabled, or if no enabled flag exists
    function isFieldVisible(key: string) {
        const enabledKey = key + "Enabled"
        return key !== "isImmutable" && (weights![enabledKey] === undefined || weights![enabledKey])
    }

    function getFieldMax(key: string): number {
        // Check if the field is contextTokens or responseTokens
        if (
            (key === "contextTokens" && weights!.contextTokensUnlocked) ||
            (key === "responseTokens" && weights!.responseTokensUnlocked)
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

    // Mock list of saved weights for dropdown
    let weightsList: Sockets.WeightsList.Response["weightsList"] = $state([])

    function handleSelectChange(e: Event) {
        socket.emit("setUserActiveWeights", { id: (e.target as HTMLSelectElement).value })
    }

    function handleNew() {
        // Get new name
        const newWeights = { ...weights }
        delete newWeights.id
        delete newWeights.isImmutable
        const name = prompt("Enter name for new weights:")
        if (name?.trim()) {
            newWeights.name = name.trim()
            socket.emit("createWeights", { weights: newWeights })
        }
    }

    function handleUpdate() {
        if (weights!.isImmutable) {
            alert("Cannot save immutable weights.")
            return
        }
        socket.emit("updateWeights", { weights })
    }

    function handleReset() {
        weights = { ...originalWeights }
    }

    function handleDelete() {
        if (weights!.isImmutable) {
            alert("Cannot delete immutable weights.")
            return
        }
        if (confirm("Are you sure you want to delete these weights? This cannot be undone.")) {
            socket.emit("deleteWeights", { id: userCtx.user.activeWeightsId })
        }
    }

    function handleSelectWeights() {
        showSelectWeights = true
    }
    function handleBackToSidebar() {
        showSelectWeights = false
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
    })
</script>

<div class="text-foreground p-4">
    {#if showSelectWeights}
        <!-- ENABLE / DISABLE WEIGHTS -->
        <div class="border-primary bg-background animate-fade-in rounded-lg border p-4 shadow-lg">
            <button
                type="button"
                class="btn preset-tonal-primary mb-4"
                onclick={handleBackToSidebar}
            >
                <Icons.ArrowLeft /> Back
            </button>
            <h2 class="mb-4 text-lg font-bold">Enable/Disable Weight Options</h2>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {#each Object.entries(fieldMeta) as [key, meta]}
                    {#if meta.type === "number" || meta.type === "boolean"}
                        <label
                            class="hover:bg-muted flex items-center gap-2 rounded p-2 transition"
                        >
                            <input
                                type="checkbox"
                                bind:checked={weights[key + "Enabled"]}
                                class="accent-primary"
                                disabled={weights[key + "Enabled"] === undefined}
                            />
                            <span class="font-medium">{meta.label}</span>
                        </label>
                    {/if}
                {/each}
            </div>
        </div>
    {:else if !!weights}
        <!-- MANAGE WEIGHTS -->
         <div class="mt-2 flex gap-2 sm:mt-0 mb-2">
                <button
                    type="button"
                    class="btn btn-sm preset-filled-primary-500"
                    onclick={handleNew}>
                        <Icons.Plus size={16} />
                    </button
                >
                <button
                    type="button"
                    class="btn btn-sm preset-filled-secondary-500"
                    onclick={handleReset}
                    disabled={!unsavedChanges}>
                    <Icons.RefreshCcw size={16} />
                </button>
                <button
                    type="button"
                    class="btn btn-sm preset-filled-error-500"
                    onclick={handleDelete}
                    disabled={!!weights && weights.isImmutable}>
                    <Icons.X size={16} />
                    </button
                >
            </div>
        <div class="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <select
                class="select select-sm bg-background border-muted rounded border"
                onchange={handleSelectChange}
                bind:value={userCtx.user.activeWeightsId}
            >
                {#each weightsList.filter((w) => w.isImmutable) as w}
                    <option value={w.id}
                        >{w.name}{#if w.isImmutable}*{/if}</option
                    >
                {/each}
                {#each weightsList.filter((w) => !w.isImmutable) as w}
                    <option value={w.id}
                        >{w.name}{#if w.isImmutable}*{/if}</option
                    >
                {/each}
            </select>
        </div>
        <div class="mb-4 flex gap-4">
            <button
                type="button"
                class="btn preset-tonal-primary w-full"
                onclick={handleSelectWeights}
            >
                Select Weights
            </button>
            <button
                type="button"
                class="btn preset-filled-primary-500 w-full"
                onclick={handleUpdate}
                disabled={(!!weights && weights.isImmutable) || !unsavedChanges}>Save</button
            >
        </div>

        <form class="space-y-4">
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="weightsName">Name</label>
                <input
                    id="weightsName"
                    type="text"
                    bind:value={weights.name}
                    class="input input-sm bg-background border-muted w-full rounded border"
                    disabled={!!weights && weights.isImmutable}
                />
            </div>
            {#each Object.entries(fieldMeta) as [key, meta]}
                {#if isFieldVisible(key)}
                    <div class="flex flex-col gap-1">
                        <label class="font-semibold" for={key}>{meta?.label ?? key}</label>
                        {#if meta?.type === "number"}
                            <div class="flex flex-col items-center gap-2">
                                <input
                                    type="range"
                                    min={meta.min}
                                    max={getFieldMax(key)}
                                    step={meta.step}
                                    id={key}
                                    bind:value={weights![key]}
                                    class="accent-primary w-full"
                                />
                                <div
                                    class="text-muted-foreground flex w-full justify-between gap-1 text-xs"
                                >
                                    <span title="Minimum value" class="select-none">{meta.min}</span
                                    >
                                    {#if editingField === key}
                                        <input
                                            type="number"
                                            min={meta.min}
                                            max={getFieldMax(key)}
                                            step={meta.step}
                                            bind:value={weights![key]}
                                            id={key + "-manual"}
                                            class="border-primary input w-16 rounded border px-1 py-0.5"
                                            onblur={() => (editingField = null)}
                                            onkeydown={(e) => {
                                                if (e.key === "Enter" || e.key === "Escape")
                                                    editingField = null
                                            }}
                                        />
                                    {:else}
                                        <button
                                            class="hover:bg-muted cursor-pointer rounded px-1 py-0.5"
                                            title="Edit"
                                            onclick={async () => {
                                                editingField = key
                                                await focusInput(key + "-manual")
                                            }}>{weights![key]}</button
                                        >
                                    {/if}
                                    <span title="Maximum value" class="select-none"
                                        >{getFieldMax(key)}</span
                                    >
                                </div>

                                {#if key === "responseTokens"}
                                    <div class="mt-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="responseTokensUnlocked"
                                            bind:checked={weights.responseTokensUnlocked}
                                            class="accent-primary"
                                        />
                                        <label for="responseTokensUnlocked" class="text-sm"
                                            >Unlock max</label
                                        >
                                    </div>
                                {:else if key === "contextTokens"}
                                    <div class="mt-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="contextTokensUnlocked"
                                            bind:checked={weights.contextTokensUnlocked}
                                            class="accent-primary"
                                        />
                                        <label for="contextTokensUnlocked" class="text-sm"
                                            >Unlock max</label
                                        >
                                    </div>
                                {/if}
                            </div>
                        {:else if meta?.type === "boolean"}
                            <input
                                type="checkbox"
                                id={key}
                                bind:checked={weights[key]}
                                class="accent-primary"
                            />
                        {:else}
                            <input
                                type="text"
                                id={key}
                                bind:value={weights[key]}
                                class="input input-sm bg-background border-muted w-full rounded border"
                            />
                        {/if}
                    </div>
                {/if}
            {/each}
        </form>
    {/if}
</div>

<WeightsUnsavedChangesModal
    open={showUnsavedChangesModal}
    onOpenChange={handleUnsavedChangesModalOpenChange}
    onConfirm={handleUnsavedChangesModalConfirm}
    onCancel={handleUnsavedChangesModalCancel}
/>
