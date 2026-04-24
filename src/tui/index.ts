import { ZR_KEY_BACKSPACE } from "@rezi-ui/core/keybindings";
import { createNodeApp } from "@rezi-ui/node";
import open from "open";

import { DEFAULT_SEARCH_COUNT } from "../config.js";
import { getFileContents, getReadme, searchRepositories } from "../github/api.js";
import type { FileContent, RepoIdentifier, SearchResult } from "../types.js";

import { createInitialState, type NavigationEntry, type TuiState } from "./state.js";
import { fileView } from "./views/file.js";
import { repoView, type RepoViewCallbacks } from "./views/repo.js";
import { searchView, type SearchViewCallbacks } from "./views/search.js";

export async function runTui(initialQuery?: string): Promise<void> {
    const initialState = createInitialState(initialQuery);

    let currentState: TuiState = initialState;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const app = createNodeApp<TuiState>({ initialState });

    const DEBOUNCE_MS = 300;

    const debouncedSearch = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = currentState.query.trim();
            if (query) performSearch(currentState);
        }, DEBOUNCE_MS);
    };

    const performSearch = async (state: TuiState) => {
        const query = state.query.trim();
        if (!query) return;

        app.update((prev) => ({ ...prev, searchLoading: true, searchError: null }));
        try {
            const results = await searchRepositories(query, DEFAULT_SEARCH_COUNT);
            app.update((prev) => ({
                ...prev,
                searchResults: results,
                searchLoading: false,
                selectedRepoIndex: -1,
            }));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            app.update((prev) => ({ ...prev, searchError: message, searchLoading: false }));
        }
    };

    const openRepo = async (result: SearchResult) => {
        const repo: RepoIdentifier = {
            owner: result.fullName.split("/")[0],
            repo: result.fullName.split("/")[1],
        };

        const historyEntry: NavigationEntry = {
            type: "search",
            query: currentState.query,
        };

        app.update((prev) => ({
            ...prev,
            page: "repo",
            selectedRepo: repo,
            repoLoading: true,
            repoError: null,
            currentPath: ".",
            focusArea: "files",
            selectedFileIndex: -1,
            navigationHistory: [...prev.navigationHistory, historyEntry],
        }));

        await loadRepoContents(repo, ".");
    };

    const loadRepoContents = async (repo: RepoIdentifier, path: string) => {
        try {
            const [files, readme] = await Promise.all([
                getFileContents(repo, path),
                path === "." ? getReadme(repo) : Promise.resolve(null),
            ]);

            const sortedFiles = Array.isArray(files)
                ? files.sort((a, b) => {
                      if (a.type === b.type) return a.name.localeCompare(b.name);
                      return a.type === "dir" ? -1 : 1;
                  })
                : [];

            app.update((prev) => ({
                ...prev,
                repoFiles: sortedFiles,
                repoReadme: readme,
                repoLoading: false,
                selectedFileIndex: sortedFiles.length > 0 ? 0 : -1,
            }));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            app.update((prev) => ({ ...prev, repoError: message, repoLoading: false }));
        }
    };

    const openFile = async (file: FileContent) => {
        if (!currentState.selectedRepo) return;

        const historyEntry: NavigationEntry = {
            type: "repo",
            repo: currentState.selectedRepo,
            path: currentState.currentPath,
        };

        if (file.type === "dir") {
            const newPath = currentState.currentPath === "." ? file.name : `${currentState.currentPath}/${file.name}`;

            app.update((prev) => ({
                ...prev,
                currentPath: newPath,
                repoLoading: true,
                repoError: null,
                selectedFileIndex: 0,
                focusArea: "files",
                navigationHistory: [...prev.navigationHistory, historyEntry],
            }));

            await loadRepoContents(currentState.selectedRepo, newPath);
        } else {
            app.update((prev) => ({
                ...prev,
                page: "file",
                currentPath: file.path,
                fileLoading: true,
                fileContent: null,
                navigationHistory: [...prev.navigationHistory, historyEntry],
            }));

            try {
                const content = await getFileContents(currentState.selectedRepo, file.path);
                if (content && !Array.isArray(content) && content.content) {
                    app.update((prev) => ({
                        ...prev,
                        fileContent: content.content ?? null,
                        fileLoading: false,
                    }));
                } else {
                    app.update((prev) => ({
                        ...prev,
                        fileContent: "Binary or empty file.",
                        fileLoading: false,
                    }));
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                app.update((prev) => ({
                    ...prev,
                    fileContent: `Error loading file: ${message}`,
                    fileLoading: false,
                }));
            }
        }
    };

    const goBack = () => {
        const history = [...currentState.navigationHistory];
        const previous = history.pop();

        if (!previous) {
            app.stop();
            return;
        }

        if (previous.type === "search") {
            app.update((prev) => ({
                ...prev,
                page: "search",
                selectedRepo: null,
                repoFiles: [],
                repoReadme: null,
                navigationHistory: history,
            }));
        } else if (previous.type === "repo") {
            app.update((prev) => ({
                ...prev,
                page: "repo",
                currentPath: previous.path ?? ".",
                fileContent: null,
                navigationHistory: history,
            }));
            if (previous.repo) {
                loadRepoContents(previous.repo, previous.path ?? ".");
            }
        } else if (previous.type === "file") {
            app.update((prev) => ({
                ...prev,
                page: "repo",
                navigationHistory: history,
            }));
        }
    };

    const goToSearch = () => {
        app.update((prev) => ({
            ...prev,
            page: "search",
            selectedRepo: null,
            repoFiles: [],
            repoReadme: null,
            fileContent: null,
            navigationHistory: [],
        }));
    };

    const searchCallbacks: SearchViewCallbacks = {
        onQueryChange: (value: string) => {
            app.update((prev) => ({ ...prev, query: value }));
        },
        performSearch: () => {
            performSearch(currentState);
        },
        openRepo,
    };

    const repoCallbacks: RepoViewCallbacks = {
        openFile,
    };

    app.view((state) => {
        currentState = state;
        switch (state.page) {
            case "search":
                return searchView(state, searchCallbacks);
            case "repo":
                return repoView(state, repoCallbacks);
            case "file":
                return fileView(state);
            default:
                return searchView(state, searchCallbacks);
        }
    });

    app.onEvent((ev) => {
        if (ev.kind !== "engine") return;

        if (currentState.page === "search") {
            if (ev.event.kind === "text") {
                const char = String.fromCodePoint(ev.event.codepoint);
                if (char.length === 1 && char >= " " && char <= "~") {
                    app.update((prev) => ({ ...prev, query: prev.query + char }));
                    debouncedSearch();
                }
            } else if (ev.event.kind === "key" && ev.event.action === "down") {
                if (ev.event.key === ZR_KEY_BACKSPACE) {
                    app.update((prev) => ({ ...prev, query: prev.query.slice(0, -1) }));
                    debouncedSearch();
                }
            }
            return;
        }
    });

    app.keys({
        escape: () => {
            goBack();
        },
        "ctrl+h": () => {
            goToSearch();
        },
        tab: () => {
            if (currentState.page === "repo" && currentState.currentPath === ".") {
                app.update((prev) => ({
                    ...prev,
                    focusArea: prev.focusArea === "files" ? "readme" : "files",
                }));
            }
        },
        "ctrl+o": async () => {
            let url: string | null = null;

            if (currentState.page === "search") {
                const q = currentState.query.trim();
                if (q) {
                    url = `https://github.com/search?q=${encodeURIComponent(q)}`;
                }
            } else if (currentState.page === "repo" && currentState.selectedRepo) {
                const { owner, repo } = currentState.selectedRepo;
                if (currentState.currentPath === ".") {
                    url = `https://github.com/${owner}/${repo}`;
                } else {
                    url = `https://github.com/${owner}/${repo}/tree/HEAD/${currentState.currentPath}`;
                }
            } else if (currentState.page === "file" && currentState.selectedRepo) {
                const { owner, repo } = currentState.selectedRepo;
                url = `https://github.com/${owner}/${repo}/blob/HEAD/${currentState.currentPath}`;
            }

            if (url) {
                await open(url);
            }
        },
    });

    if (initialQuery) {
        setTimeout(() => {
            performSearch(currentState);
        }, 100);
    }

    await app.run();
}
