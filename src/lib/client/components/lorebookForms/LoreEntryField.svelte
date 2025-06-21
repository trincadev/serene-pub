<script lang="ts">
	interface Props {
		content: string
		lorebookBindingList: Sockets.LorebookBindingList.Response["lorebookBindingList"]
	}

	let { content = $bindable(), lorebookBindingList = $bindable() }: Props =
		$props()

	let editorContent: HTMLDivElement | null = $state(null)
	let textareaRet: HTMLTextAreaElement | null = $state(null)

	// Helper to get badge label for a charId
	function getBadgeLabel(charId) {
		const binding = lorebookBindingList.find((b) => b.id == charId)
		if (!binding) return "Unknown"
		if (binding.character) return binding.character.nickname || binding.character.name
		if (binding.persona) return binding.persona.name
		return "Unknown"
	}

	// Render badges in the contenteditable div
	function renderBadges() {
		if (!editorContent) return
		const html = (content || "").replace(/\{char:(\d+)\}/g, (match, id) => {
			const name = getBadgeLabel(id)
			return `<span class=\"badge preset-filled-primary-500\" contenteditable=\"false\" data-charid=\"${id}\">${name}</span>`
		})
		editorContent.innerHTML = html
	}

	function handleContentInput(e) {
		const div = e.currentTarget

		// --- Save caret as Range before DOM changes ---
		let savedRange = null
		const sel = window.getSelection()
		if (sel && sel.rangeCount > 0) {
			savedRange = sel.getRangeAt(0).cloneRange()
		}

		let html = div.innerHTML
		// Convert badge spans back to {char:id}
		html = html.replace(
			/<span[^>]*class=["']badge preset-filled-primary-500["'][^>]*data-charid=["'](\d+)["'][^>]*>([^<]*)<\/span>/g,
			(m, id, name) => {
				const binding = lorebookBindingList.find((b) => {
					if (b.character && (b.character.nickname === name || b.character.name === name)) return true
					if (b.persona && b.persona.name === name) return true
					return false
				})
				return binding ? `{char:${binding.id}}` : `{char:${id}}`
			}
		)
		// Convert <br> and block tags to \n, then strip tags
		html = html.replace(/<br\s*\/?>(?!$)/gi, "\n")
		html = html.replace(/<div>/gi, "\n")
		html = html.replace(/<\/div>/gi, "")
		html = html.replace(/<p>/gi, "\n")
		html = html.replace(/<\/p>/gi, "")
		html = html.replace(/\n{2,}/g, "\n") // Collapse multiple newlines
		let plain = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
		content = plain

		// Re-render badges and newlines
		const badgeHtml = (plain || "")
			.replace(/\n/g, "<br>")
			.replace(/\{char:(\d+)\}/g, (match, id) => {
				const name = getBadgeLabel(id)
				return `<span class=\"badge preset-filled-primary-500\" contenteditable=\"false\" data-charid=\"${id}\">${name}</span>`
			})
		if (div.innerHTML !== badgeHtml) div.innerHTML = badgeHtml

		// --- Restore caret using saved Range ---
		if (document.activeElement === div && savedRange) {
			restoreRange(savedRange, div)
		}

		// --- Enforce caret never inside badge ---
		const sel2 = window.getSelection()
		if (sel2 && sel2.anchorNode) {
			let n = sel2.anchorNode
			if (
				(n.nodeType === 3 && n.parentNode.classList && n.parentNode.classList.contains("badge") && sel2.anchorOffset === n.textContent.length) ||
				(n.nodeType === 1 && n.classList && n.classList.contains("badge"))
			) {
				const badge = n.nodeType === 3 ? n.parentNode : n
				const range = document.createRange()
				range.setStartAfter(badge)
				range.collapse(true)
				sel2.removeAllRanges()
				sel2.addRange(range)
			}
		}
	}

	// Restore caret to the correct position after DOM changes
	function restoreRange(saved, root) {
		let charCount = 0, found = false, targetOffset = 0
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
		while (walker.nextNode()) {
			const n = walker.currentNode
			if (n === saved.startContainer) {
				targetOffset = charCount + saved.startOffset
				found = true
				break
			}
			charCount += n.textContent.length
		}
		if (!found) targetOffset = charCount
		let remaining = targetOffset
		walker.currentNode = root
		while (walker.nextNode()) {
			const n = walker.currentNode
			if (n.textContent.length >= remaining) {
				const range = document.createRange()
				range.setStart(n, remaining)
				range.collapse(true)
				const sel = window.getSelection()
				sel.removeAllRanges()
				sel.addRange(range)
				return
			} else {
				remaining -= n.textContent.length
			}
		}
		// If not found, place at end
		const range = document.createRange()
		range.selectNodeContents(root)
		range.collapse(false)
		const sel = window.getSelection()
		sel.removeAllRanges()
		sel.addRange(range)
	}

	function handleContentKeydown(e) {
		const sel = window.getSelection()
		if (!sel || !sel.anchorNode) return
		let node = sel.anchorNode

		// If caret is inside a badge, move it after
		if (
			(node.nodeType === 3 && node.parentNode.classList && node.parentNode.classList.contains("badge")) ||
			(node.nodeType === 1 && node.classList && node.classList.contains("badge"))
		) {
			const badge = node.nodeType === 3 ? node.parentNode : node
			const range = document.createRange()
			range.setStartAfter(badge)
			range.collapse(true)
			sel.removeAllRanges()
			sel.addRange(range)
			e.preventDefault()
			return
		}
		if (node.nodeType === 1 && node.classList && node.classList.contains("badge")) {
			const range = document.createRange()
			range.setStartAfter(node)
			range.collapse(true)
			const sel = window.getSelection()
			sel.removeAllRanges()
			sel.addRange(range)
			e.preventDefault()
			return
		}

		// Backspace after badge: only remove badge if caret is at end
		if (e.key === "Backspace") {
			if (
				node.nodeType === 3 &&
				node.previousSibling &&
				node.previousSibling.nodeType === 1 &&
				node.previousSibling.classList.contains("badge")
			) {
				const badge = node.previousSibling
				const charId = badge.getAttribute("data-charid")
				const range = sel.getRangeAt(0)
				const contentDiv = editorContent
				let atEnd = false
				if (contentDiv) {
					const testRange = document.createRange()
					testRange.selectNodeContents(contentDiv)
					testRange.collapse(false)
					atEnd = range.compareBoundaryPoints(Range.END_TO_END, testRange) === 0
				}
				if (atEnd) {
					const before = content || ""
					const after = before.replace(new RegExp(`(\\{char:${charId})\\}`), `$1`)
					if (before !== after) {
						content = after
						e.preventDefault()
					}
					return
				}
			}
		}
		// Prevent typing inside badge
		if (node.nodeType === 1 && node.classList && node.classList.contains("badge")) {
			e.preventDefault()
			const range = document.createRange()
			range.setStartAfter(node)
			range.collapse(true)
			const sel = window.getSelection()
			sel.removeAllRanges()
			sel.addRange(range)
		}
	}

	// Example character map (replace with your actual character list)
	$effect(() => {
		for (const entry of worldLoreEntries) {
			if (
				entry._contentDiv &&
				document.activeElement !== entry._contentDiv
			) {
				renderBadges(entry)
			}
		}
	})

	// Keep a reference to each contenteditable div per entry
	$effect(() => {
		for (const entry of worldLoreEntries) {
			if (
				entry._contentDiv &&
				document.activeElement !== entry._contentDiv
			) {
				if (entry._contentDiv.textContent !== entry.content) {
					entry._contentDiv.textContent = entry.content || ""
				}
			}
		}
	})

	// Keep editorContent in sync with content when not focused
	$effect(() => {
		if (editorContent && document.activeElement !== editorContent) {
			renderBadges()
		}
	})
</script>

<div>
	<textarea
		bind:this={textareaRet}
		id="entryContent"
		class="textarea textarea-lg w-full"
		rows="4"
		bind:value={content}
		required
	></textarea>
	<div
		bind:this={editorContent}
		class="min-h-[4em] rounded border bg-white p-2 text-black"
		contenteditable="true"
		role="textbox"
		aria-label="Content"
		oninput={handleContentInput}
		onkeydown={handleContentKeydown}
	></div>
</div>

<style>
</style>
