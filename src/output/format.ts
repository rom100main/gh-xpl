import type { FileContent, SearchResult } from "../types.js";

export function formatSearchResultsMarkdown(results: SearchResult[]): string {
    if (results.length === 0) {
        return "No repositories found.";
    }

    const lines: string[] = [];
    lines.push("# Search Results\n");

    for (const repo of results) {
        lines.push(`## ${repo.fullName}`);
        if (repo.description) {
            lines.push(repo.description);
        }
        lines.push(`⭐ ${repo.stars.toLocaleString()} | ${repo.language || "No language"}`);
        lines.push(`[${repo.url}](${repo.url})\n`);
    }

    return lines.join("\n");
}

export function formatFileListMarkdown(files: FileContent[], path: string): string {
    if (files.length === 0) {
        return "Directory is empty.";
    }

    const lines: string[] = [];
    lines.push(`# Contents of ${path || "root"}\n`);

    for (const file of files) {
        const icon = file.type === "dir" ? "📁" : "📄";
        lines.push(`${icon} ${file.name}${file.type === "dir" ? "/" : ""}`);
    }

    return lines.join("\n");
}

export function formatReadmeMarkdown(content: string, repoName: string): string {
    return `# ${repoName}\n\n${content}`;
}
