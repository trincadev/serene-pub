import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core"
import { Plugin, PluginKey } from "prosemirror-state"
import { Fragment, NodeType } from "prosemirror-model"

const LEGACY_TAG_REGEX = /\{(user|char|persona|character)\}/g

function createClipboardTextSerializerPlugin(type: NodeType): Plugin<any> {
    return new Plugin({
        key: new PluginKey("legacyTagClipboardTextSerializer"),
        props: {
            clipboardTextSerializer(slice) {
                let text = ""
                slice.content.descendants((node) => {
                    if (node.type === type) {
                        text += node.attrs.tag
                    } else if (node.isText) {
                        text += node.text
                    }
                    return true
                })
                return text
            }
        }
    })
}

const createPasteTransformPlugin = (type: any) => {
    return new Plugin({
        key: new PluginKey("legacyTagPasteTransform"),
        appendTransaction(transactions, oldState, newState) {
            const docChanged = transactions.some((tr) => tr.docChanged)
            if (!docChanged) return

            let tr = newState.tr
            let modified = false

            newState.doc.descendants((node, pos) => {
                if (node.isText && node.text) {
                    let m
                    let lastIndex = 0
                    let parts: (string | { tag: string })[] = []
                    LEGACY_TAG_REGEX.lastIndex = 0
                    while ((m = LEGACY_TAG_REGEX.exec(node.text)) !== null) {
                        if (m.index > lastIndex) {
                            parts.push(node.text.slice(lastIndex, m.index))
                        }
                        parts.push({ tag: m[0] })// store tag without extra chars outside
                        lastIndex = m.index + m[0].length
                    }
                    if (parts.length > 0) {
                        if (lastIndex < node.text.length) {
                            parts.push(node.text.slice(lastIndex))
                        }
                        let frag = Fragment.empty
                        for (const part of parts) {
                            if (typeof part === "string") {
                                frag = frag.append(Fragment.from(newState.schema.text(part)))
                            } else {
                                frag = frag.append(Fragment.from(type.create({ tag: part.tag })))
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

const LegacyTag = Node.create({
    name: "legacyTag",
    inline: true,
    group: "inline",
    atom: true,
    selectable: false,

    addAttributes() {
        return {
            tag: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-tag"),
                renderHTML: (attributes) => ({ "data-tag": attributes.tag })
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: "span.legacy-tag[data-tag]"
            }
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
    return [
        "span",
        mergeAttributes(HTMLAttributes, {
            class: "badge preset-filled-error-500 legacy-tag",
            "data-tag": node.attrs.tag,
            contenteditable: "false",
            title: `Legacy {user} or {char} tags are not recommended. Use lorebook character bindings instead.`
        }),
        `${node.attrs.tag}`
    ]
},

    addProseMirrorPlugins() {
        return [
            createPasteTransformPlugin(this.type),
            createClipboardTextSerializerPlugin(this.type)
        ]
    }
})

export default LegacyTag

