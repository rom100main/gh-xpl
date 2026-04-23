import type { RepoIdentifier } from "../types.js";

export function parseRepoInput(input: string): RepoIdentifier | null {
    // Handle full URL: https://github.com/owner/repo
    const urlMatch = input.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) {
        return {
            owner: urlMatch[1],
            repo: urlMatch[2].replace(/\.git$/, ""),
        };
    }

    // Handle short form: owner/repo
    const shortMatch = input.match(/^([^/]+)\/([^/]+)$/);
    if (shortMatch) {
        return {
            owner: shortMatch[1],
            repo: shortMatch[2].replace(/\.git$/, ""),
        };
    }

    return null;
}
