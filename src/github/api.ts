import { Octokit } from "@octokit/rest";

import { GITHUB_RAW_BASE_URL } from "../config.js";
import type { FileContent, RepoIdentifier, SearchResult } from "../types.js";
import { getApiToken } from "../utils/auth.js";

function createOctokit(): Octokit {
    const token = getApiToken();
    return new Octokit({
        auth: token,
    });
}

export async function searchRepositories(query: string, count: number): Promise<SearchResult[]> {
    const octokit = createOctokit();

    const response = await octokit.rest.search.repos({
        q: query,
        per_page: count,
    });

    return response.data.items.map((item) => ({
        fullName: item.full_name,
        description: item.description,
        url: item.html_url,
        stars: item.stargazers_count,
        language: item.language,
    }));
}

export async function getReadme(identifier: RepoIdentifier): Promise<string | null> {
    const octokit = createOctokit();

    try {
        const response = await octokit.rest.repos.getReadme({
            owner: identifier.owner,
            repo: identifier.repo,
        });

        const content = Buffer.from(response.data.content, "base64").toString("utf-8");
        return content;
    } catch {
        return null;
    }
}

export async function getFileContents(
    identifier: RepoIdentifier,
    filePath: string,
): Promise<FileContent | FileContent[] | null> {
    const octokit = createOctokit();

    try {
        const response = await octokit.rest.repos.getContent({
            owner: identifier.owner,
            repo: identifier.repo,
            path: filePath,
        });

        // Handle single file
        if (!Array.isArray(response.data)) {
            const data = response.data as {
                type: string;
                name: string;
                path: string;
                size: number;
                content?: string;
                download_url?: string | null;
            };

            if (data.type === "file") {
                let content: string | undefined;
                if (data.content) {
                    content = Buffer.from(data.content, "base64").toString("utf-8");
                }
                return {
                    name: data.name,
                    path: data.path,
                    type: "file",
                    size: data.size,
                    content,
                    downloadUrl: data.download_url,
                };
            }
            return null;
        }

        // Handle directory
        return response.data.map((item) => ({
            name: item.name,
            path: item.path,
            type: item.type as "file" | "dir",
        }));
    } catch {
        return null;
    }
}

export async function downloadRawFile(identifier: RepoIdentifier, filePath: string): Promise<string | null> {
    const url = `${GITHUB_RAW_BASE_URL}/${identifier.owner}/${identifier.repo}/HEAD/${filePath}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        return await response.text();
    } catch {
        return null;
    }
}
