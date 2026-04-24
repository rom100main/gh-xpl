export function wrapLines(text: string, width: number): string[] {
    if (width <= 0) return text.split("\n");

    const result: string[] = [];
    for (const line of text.split("\n")) {
        if (line.length === 0) {
            result.push("");
            continue;
        }
        let remaining = line;
        while (remaining.length > width) {
            let breakAt = width;
            const spaceIdx = remaining.lastIndexOf(" ", width);
            if (spaceIdx > 0) breakAt = spaceIdx;
            result.push(remaining.slice(0, breakAt));
            remaining = remaining.slice(breakAt).trimStart();
        }
        if (remaining.length > 0) result.push(remaining);
    }
    return result;
}
