export interface RepoIdentifier {
    owner: string;
    repo: string;
}

export interface SearchResult {
    fullName: string;
    description: string | null;
    url: string;
    stars: number;
    language: string | null;
}

export interface FileContent {
    name: string;
    path: string;
    type: "file" | "dir";
    size?: number;
    content?: string;
    downloadUrl?: string | null;
}

export interface CliOptions {
    json?: boolean;
    global?: boolean;
    count?: string;
}
