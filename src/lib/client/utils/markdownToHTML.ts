import { marked } from "marked"

export function markQuotedText(md: string): string {
	return md
		.replaceAll("“", '"')
		.replaceAll("”", '"')
		.replaceAll(/"([^"\n]+)"/g, '[[QT]]"$1"[[/QT]]')
}

export function replaceQuotedTextMarkers(html: string): string {
	return html
		.replaceAll("[[QT]]", '<span class="quoted-text">')
		.replaceAll("[[/QT]]", "</span>")
}

export function renderMarkdownWithQuotedText(md: string): string {
	const markedMd = markQuotedText(md)
	let html = marked.parse(markedMd) as string
	html = replaceQuotedTextMarkers(html)
	return html
}
