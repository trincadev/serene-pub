import { Node, mergeAttributes, nodeInputRule, InputRule } from "@tiptap/core"
import { Plugin, PluginKey } from "prosemirror-state"
import { Fragment } from "prosemirror-model"

interface LorebookBindingTagOptions {
	getLabel: (raw: string) => string
	getCharType: (raw: string) => "character" | "persona" | "unknown"
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		LorebookBindingTag: {
			insertLorebookBindingTag: (raw: string) => ReturnType
		}
	}
}

const CHAR_TAG_REGEX = /\{\{char:(\d+)\}\}/g // Matches {{char:N}} syntax

// Custom input rule: replace all {{char:N}} in the changed text node
function LorebookBindingTagInputRule(type: any) {
	return new InputRule({
		find: /\{\{char:(\d+)\}\}/g, // Matches {{char:N}} syntax
		handler: ({ range, match, commands }) => {
			commands.deleteRange(range)
			commands.insertContent({ type: type.name, attrs: { id: match[1] } })
		}
	})
}

const createPasteTransformPlugin = (type: any) => {
	return new Plugin({
		key: new PluginKey("LorebookBindingTagPasteTransform"),
		appendTransaction(transactions, oldState, newState) {
			// Only run on paste or if doc changed
			const docChanged = transactions.some((tr) => tr.docChanged)
			if (!docChanged) return

			let tr = newState.tr
			let modified = false

			newState.doc.descendants((node, pos) => {
				if (node.isText && node.text) {
					let m
					let lastIndex = 0
					let parts: (string | { id: string })[] = []
					CHAR_TAG_REGEX.lastIndex = 0
					while ((m = CHAR_TAG_REGEX.exec(node.text)) !== null) {
						if (m.index > lastIndex) {
							parts.push(node.text.slice(lastIndex, m.index))
						}
						parts.push({ id: m[1] })
						lastIndex = m.index + m[0].length
					}
					if (parts.length > 0) {
						if (lastIndex < node.text.length) {
							parts.push(node.text.slice(lastIndex))
						}
						// Replace the text node with a fragment of text and LorebookBindingTag nodes
						let frag = Fragment.empty
						for (const part of parts) {
							if (typeof part === "string") {
								frag = frag.append(
									Fragment.from(newState.schema.text(part))
								)
							} else {
								frag = frag.append(
									Fragment.from(type.create({ id: part.id }))
								)
							}
						}
						tr = tr.replaceWith(pos, pos + node.nodeSize, frag)
						modified = true
					}
				}
				return true
			})
			if (modified) return tr
			return
		}
	})
}

const createClipboardTextSerializerPlugin = (type: any) => {
	return new Plugin({
		key: new PluginKey("LorebookBindingTagClipboardTextSerializer"),
		props: {
			clipboardTextSerializer: (slice) => {
				let text = ""
				slice.content.descendants((node) => {
					if (node.type === type) {
						text += `{{char:${node.attrs.id}}}` // Use preferred {{char:N}} syntax
					} else if (node.isText) {
						text += node.text
					} else if (node.isBlock) {
						text += "\n"
					}
					return true
				})
				return text
			}
		}
	})
}

const LorebookBindingTag = Node.create<LorebookBindingTagOptions>({
	name: "LorebookBindingTag",
	inline: true,
	group: "inline",
	atom: true,
	selectable: false,

	addOptions() {
		return {
			getLabel: (raw: string) => raw,
			getCharType: (raw: string) => {
				return "unknown"
			}
		}
	},

	addAttributes() {
		return {
			id: {
				default: "",
				parseHTML: (element) => element.getAttribute("data-id"),
				renderHTML: (attributes) => ({ "data-id": attributes.id })
			}
		}
	},

	parseHTML() {
		return [
			{
				tag: "span.character-tag[data-id]"
			}
		]
	},

	renderHTML({ node, HTMLAttributes }) {
		const raw = `{{char:${node.attrs.id}}}` // Use preferred {{char:N}} syntax
		const charType = this.options.getCharType(raw)
		let typeClass = ""
		if (charType === "character") typeClass = "preset-filled-primary-500"
		else if (charType === "persona")
			typeClass = "preset-filled-secondary-500"
		else typeClass = "preset-filled-warning-500"
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				class: `badge ${typeClass} character-tag`,
				"data-id": node.attrs.id,
				contenteditable: "false",
				title:
					charType === "character"
						? `Character: ${this.options.getLabel(raw)}`
						: charType === "persona"
							? `Persona: ${this.options.getLabel(raw)}`
							: `Unbound character`
			}),
			this.options.getLabel(raw)
		]
	},

	addCommands() {
		return {
			insertLorebookBindingTag:
				(raw) =>
				({ commands }) => {
					return commands.insertContent(raw)
				}
		}
	},

	addGlobalAttributes() {
		return [
			{
				types: [this.name],
				attributes: {},
				renderText({ node }: { node: any }) {
					return `{{char:${node.attrs.id}}}` // Use preferred {{char:N}} syntax
				}
			}
		]
	},

	addProseMirrorPlugins() {
		return [
			createPasteTransformPlugin(this.type),
			createClipboardTextSerializerPlugin(this.type)
		]
	},
	addInputRules() {
		return [LorebookBindingTagInputRule(this.type)]
	}
})
// Usage: Call forceRawContentCopy(editor.view, () => rawContent) after editor is mounted.

export default LorebookBindingTag
