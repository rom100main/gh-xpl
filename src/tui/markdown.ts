import type { TextStyle } from "@rezi-ui/core";
import type { Token, Tokens } from "marked";
import { marked } from "marked";

import { YELLOW, BLUE } from "./colors.js";

const wikilinkExtension = {
    name: "wikilink",
    level: "inline",
    start(src: string) {
        return src.match(/\[\[/)?.index;
    },
    tokenizer(src: string) {
        const rule = /^\[\[([^\]]+)\]\]/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: "wikilink",
                raw: match[0],
                text: match[1],
            };
        }
        return undefined;
    },
    renderer(token: Tokens.Generic) {
        return `<a href="${token.text}">${token.text}</a>`;
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.use({ extensions: [wikilinkExtension as any] });

export interface MdToken {
    text: string;
    style: TextStyle;
}

export function wrapTokenLines(tokens: MdToken[], maxCols: number, wrapIndent = ""): MdToken[][] {
    const lines: MdToken[][] = [];
    let currentLine: MdToken[] = [];
    let currentLength = 0;

    const splitTokens: MdToken[] = [];
    for (const token of tokens) {
        const parts = token.text.split("\n");
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].length > 0) {
                splitTokens.push({ text: parts[i], style: token.style });
            }
            if (i < parts.length - 1) {
                splitTokens.push({ text: "\n", style: token.style });
            }
        }
    }

    for (const token of splitTokens) {
        if (token.text === "\n") {
            lines.push(currentLine);
            currentLine = [];
            currentLength = 0;
            continue;
        }

        let remainingText = token.text;

        while (remainingText.length > 0) {
            const isNewLine = currentLine.length === 0;
            if (isNewLine && lines.length > 0 && wrapIndent.length > 0) {
                currentLine.push({ text: wrapIndent, style: {} });
                currentLength += wrapIndent.length;
            }

            const spaceLeft = maxCols - currentLength;

            if (spaceLeft <= 0) {
                lines.push(currentLine);
                currentLine = [];
                currentLength = 0;
                continue;
            }

            if (remainingText.length <= spaceLeft) {
                currentLine.push({ text: remainingText, style: token.style });
                currentLength += remainingText.length;
                remainingText = "";
            } else {
                currentLine.push({ text: remainingText.substring(0, spaceLeft), style: token.style });
                lines.push(currentLine);
                currentLine = [];
                currentLength = 0;
                remainingText = remainingText.substring(spaceLeft);
            }
        }
    }

    if (currentLine.length > 0 || lines.length === 0) {
        lines.push(currentLine);
    }
    return lines;
}

function renderInline(tokens: Token[] | undefined, currentStyle: TextStyle = {}): MdToken[] {
    if (!tokens) return [];
    const result: MdToken[] = [];
    for (const token of tokens) {
        switch (token.type) {
            case "text":
            case "escape":
            case "html":
                result.push({
                    text: "text" in token ? (token as { text: string }).text : token.raw,
                    style: currentStyle,
                });
                break;
            case "strong":
                result.push(...renderInline((token as Tokens.Strong).tokens, { ...currentStyle, bold: true }));
                break;
            case "em":
                result.push(...renderInline((token as Tokens.Em).tokens, { ...currentStyle, italic: true }));
                break;
            case "del":
                result.push(...renderInline((token as Tokens.Del).tokens, { ...currentStyle, strikethrough: true }));
                break;
            case "codespan":
                result.push({ text: token.raw, style: { ...currentStyle, fg: YELLOW } });
                break;
            case "link":
            case "wikilink":
                result.push({
                    text: (token as Tokens.Generic).text,
                    style: { ...currentStyle, fg: BLUE, underline: true },
                });
                break;
            case "image":
                result.push({
                    text: `[Image: ${(token as Tokens.Image).text}]`,
                    style: { ...currentStyle, dim: true },
                });
                break;
            case "br":
                result.push({ text: "\n", style: currentStyle });
                break;
            default:
                if ("tokens" in token && token.tokens) {
                    result.push(...renderInline(token.tokens as Token[], currentStyle));
                } else {
                    result.push({ text: token.raw, style: currentStyle });
                }
                break;
        }
    }
    return result;
}

function renderBlock(token: Token, maxCols: number, indent = "", prefix = ""): MdToken[][] {
    const lines: MdToken[][] = [];

    switch (token.type) {
        case "space":
            return [[{ text: "", style: {} }]];

        case "heading": {
            const hToken = token as Tokens.Heading;
            const headingPrefix = "#".repeat(hToken.depth) + " ";
            const inline = renderInline(hToken.tokens, { bold: true, fg: BLUE });
            inline.unshift({ text: indent + prefix + headingPrefix, style: { bold: true, fg: BLUE } });
            return wrapTokenLines(inline, maxCols, indent + " ".repeat(headingPrefix.length));
        }

        case "paragraph": {
            const pToken = token as Tokens.Paragraph;
            const inline = renderInline(pToken.tokens);
            if (prefix) {
                inline.unshift({ text: indent + prefix, style: {} });
            } else if (indent) {
                inline.unshift({ text: indent, style: {} });
            }
            return wrapTokenLines(inline, maxCols, indent + " ".repeat(prefix.length));
        }

        case "list": {
            const lToken = token as Tokens.List;
            for (let i = 0; i < lToken.items.length; i++) {
                const item = lToken.items[i];
                const itemPrefix = lToken.ordered ? `${(lToken.start as number) + i}. ` : "- ";

                for (let j = 0; j < item.tokens.length; j++) {
                    const childToken = item.tokens[j];
                    const isFirst = j === 0;
                    const childIndent = indent + " ".repeat(itemPrefix.length);

                    const pfx = isFirst ? itemPrefix : "";
                    const childLines = renderBlock(childToken, maxCols, isFirst ? indent : childIndent, pfx);
                    lines.push(...childLines);
                }
            }
            return lines;
        }

        case "blockquote": {
            const bToken = token as Tokens.Blockquote;
            for (const child of bToken.tokens) {
                lines.push(...renderBlock(child, maxCols, indent + "> ", prefix));
            }
            return lines;
        }

        case "code": {
            const cToken = token as Tokens.Code;
            lines.push([{ text: indent + prefix + "```" + (cToken.lang || ""), style: { dim: true } }]);
            const codeLines = cToken.text.split("\n");
            for (const cl of codeLines) {
                lines.push([{ text: indent + " ".repeat(prefix.length) + cl, style: { fg: YELLOW } }]);
            }
            lines.push([{ text: indent + " ".repeat(prefix.length) + "```", style: { dim: true } }]);
            return lines;
        }

        case "hr":
            return [[{ text: indent + prefix + "---", style: { dim: true } }]];

        default:
            if ("tokens" in token && Array.isArray(token.tokens)) {
                const inline = renderInline(token.tokens as Token[]);
                if (prefix) {
                    inline.unshift({ text: indent + prefix, style: {} });
                } else if (indent) {
                    inline.unshift({ text: indent, style: {} });
                }
                lines.push(...wrapTokenLines(inline, maxCols, indent + " ".repeat(prefix.length)));
            } else if ("text" in token && typeof token.text === "string") {
                lines.push(
                    ...wrapTokenLines(
                        [{ text: indent + prefix + token.text, style: {} }],
                        maxCols,
                        indent + " ".repeat(prefix.length),
                    ),
                );
            } else {
                lines.push([{ text: indent + prefix + token.raw, style: {} }]);
            }
            return lines;
    }
}

export function parseAndWrapMarkdown(text: string, maxCols: number): MdToken[][] {
    let markdownContent = text;
    const lines: MdToken[][] = [];

    // Parse YAML frontmatter
    if (markdownContent.startsWith("---\n") || markdownContent.startsWith("---\r\n")) {
        const endIdx = markdownContent.indexOf("\n---", 3);
        if (endIdx !== -1) {
            const frontmatter = markdownContent.substring(0, endIdx + 4);
            markdownContent = markdownContent.substring(endIdx + 4).trimStart();

            lines.push([{ text: "---", style: { dim: true } }]);
            const fmText = frontmatter.substring(4, frontmatter.length - 4).trim();
            for (const fmLine of fmText.split("\n")) {
                lines.push([{ text: fmLine, style: { dim: true } }]);
            }
            lines.push([{ text: "---", style: { dim: true } }]);
            lines.push([{ text: "", style: {} }]);
        }
    }

    const tokens = marked.lexer(markdownContent);
    const parsedLines = tokens.flatMap((t) => renderBlock(t, maxCols));
    return lines.concat(parsedLines);
}
