import { marked } from "marked"

// Fix italic formatting to handle trailing spaces before closing asterisk
function fixItalicSpaces(text: string): string {
	// Replace patterns like "*text *" with "*text*" to fix italic parsing
	return text.replace(/\*([^*\n]+?)\s+\*/g, "*$1*")
}

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
	// Fix italic formatting with trailing spaces before processing
	const fixedMd = fixItalicSpaces(md)
	const markedMd = markQuotedText(fixedMd)
	let html = marked.parse(markedMd) as string
	html = replaceQuotedTextMarkers(html)
	return html
}
