// import type { Plugin } from 'svelte-exmarkdown';
// import type { Root, Parent, Text } from 'mdast';
// import { visit } from 'unist-util-visit';

// function createQuotedTextNode(text: string) {
//     return {
//         type: 'quotedText',
//         value: text
//     }
// }

// export function remarkQuotedText() {
//     return (tree: Root) => {
//         visit(tree, 'text', (node: any, index: number | undefined, parent: Parent | undefined) => {
//             if (!parent || typeof index !== 'number') return;
//             const value = node.value;
//             const regex = /"([^"\n]+)"/g;
//             let match;
//             let lastIndex = 0;
//             const newChildren: any[] = [];
//             while ((match = regex.exec(value)) !== null) {
//                 if (match.index > lastIndex) {
//                     newChildren.push({
//                         type: 'text',
//                         value: value.slice(lastIndex, match.index)
//                     });
//                 }
//                 // Use a custom quotedText node
//                 newChildren.push(createQuotedTextNode('"' + match[1] + '"'));
//                 lastIndex = match.index + match[0].length;
//             }
//             if (lastIndex < value.length) {
//                 newChildren.push({
//                     type: 'text',
//                     value: value.slice(lastIndex)
//                 });
//             }
//             if (newChildren.length > 0) {
//                 parent.children.splice(index, 1, ...newChildren);
//                 return [visit.SKIP, index + newChildren.length];
//             }
//         });
//     };
// }

// export const quotedTextPlugin: Plugin = {
//     remarkPlugin: remarkQuotedText
// };
