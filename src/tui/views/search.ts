import { ui } from "@rezi-ui/core";

import type { SearchResult } from "../../types.js";
import { CYAN, YELLOW, RED } from "../colors.js";
import type { TuiState } from "../state.js";

function truncate(text: string | null, maxLen: number): string {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + "…";
}

function formatStars(stars: number): string {
    if (stars >= 1000) {
        return `${(stars / 1000).toFixed(1)}k`;
    }
    return String(stars);
}

export function searchView(state: TuiState, callbacks: SearchViewCallbacks) {
    const body = state.searchLoading
        ? ui.spinner({ label: "Searching GitHub..." })
        : state.searchError
          ? ui.text(`Error: ${state.searchError}`, { style: { fg: RED } })
          : state.searchResults.length === 0 && state.query !== ""
            ? ui.text("No repositories found.", { style: { dim: true } })
            : ui.virtualList({
                  id: "repo-list",
                  items: state.searchResults,
                  itemHeight: 4,
                  focusConfig: { contentStyle: { underline: false } },
                  renderItem: (result: SearchResult, index: number, focused: boolean) =>
                      ui.column({ gap: 0 }, [
                          ui.row({ gap: 1 }, [
                              ui.text(focused ? `> ${result.fullName}` : `  ${result.fullName}`, {
                                  key: `name-${index}`,
                                  style: focused ? { bold: true, fg: CYAN } : { bold: true },
                              }),
                              ui.text(`★ ${formatStars(result.stars)}`, {
                                  key: `stars-${index}`,
                                  style: { fg: YELLOW },
                              }),
                              result.language
                                  ? ui.text(`(${result.language})`, {
                                        key: `lang-${index}`,
                                        style: { dim: true },
                                    })
                                  : null,
                          ]),
                          ui.text(`  ${truncate(result.description, (process.stdout.columns ?? 80) - 4)}`, {
                              key: `desc-${index}`,
                              style: { dim: true },
                          }),
                          ui.text("", { key: `spacer-${index}` }),
                      ]),
                  onSelect: (result: SearchResult) => callbacks.openRepo(result),
              });

    const statusBar = ui.statusBar({
        left: [
            ui.kbd("↑↓"),
            ui.text("navigate", { style: { dim: true } }),
            ui.kbd("enter"),
            ui.text("open repo", { style: { dim: true } }),
        ],
        right: [
            ui.kbd("ctrl+o"),
            ui.text("browser", { style: { dim: true } }),
            ui.kbd("esc"),
            ui.text("quit", { style: { dim: true } }),
        ],
    });

    return ui.page({
        body: ui.focusTrap({ id: "search-trap", active: true, initialFocus: "repo-list" }, [
            ui.column({ gap: 0 }, [
                ui.input({
                    id: "search-input",
                    value: state.query,
                    focusable: false,
                    placeholder: "Search GitHub repositories...",
                    onInput: (value: string) => callbacks.onQueryChange(value),
                }),
                ui.divider(),
                body,
            ]),
        ]),
        footer: statusBar,
    });
}

export interface SearchViewCallbacks {
    onQueryChange: (value: string) => void;
    performSearch: () => void;
    openRepo: (result: SearchResult) => void;
}
