import type { FileContent, RepoIdentifier, SearchResult } from "../types.js";

export type TuiPage = "search" | "repo" | "file";

export type FocusArea = "files" | "readme";

export interface NavigationEntry {
    type: "search" | "repo" | "file";
    query?: string;
    repo?: RepoIdentifier;
    path?: string;
}

export interface TuiState {
    page: TuiPage;
    query: string;
    searchResults: SearchResult[];
    searchLoading: boolean;
    searchError: string | null;
    selectedRepoIndex: number;
    selectedRepo: RepoIdentifier | null;
    repoFiles: FileContent[];
    repoReadme: string | null;
    repoLoading: boolean;
    repoError: string | null;
    selectedFileIndex: number;
    focusArea: FocusArea;
    currentPath: string;
    fileContent: string | null;
    fileLoading: boolean;
    navigationHistory: NavigationEntry[];
}

export function createInitialState(initialQuery?: string): TuiState {
    return {
        page: "search",
        query: initialQuery ?? "",
        searchResults: [],
        searchLoading: false,
        searchError: null,
        selectedRepoIndex: -1,
        selectedRepo: null,
        repoFiles: [],
        repoReadme: null,
        repoLoading: false,
        repoError: null,
        selectedFileIndex: -1,
        focusArea: "files",
        currentPath: ".",
        fileContent: null,
        fileLoading: false,
        navigationHistory: [],
    };
}
