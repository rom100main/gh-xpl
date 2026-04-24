import { ui } from "@rezi-ui/core";
import he from "he";

import type { FileContent } from "../../types.js";
import type { TuiState } from "../state.js";
import { CYAN, GREEN, RED, BLUE } from "../colors.js";
import { wrapLines } from "../utils.js";

function getFileIcon(file: FileContent): string {
    if (file.type === "dir") {
        return "📁";
    }
    return "📄";
}

export function repoView(state: TuiState, callbacks: RepoViewCallbacks) {
    const cols = process.stdout.columns ?? 80;
    const rows = process.stdout.rows ?? 24;

    const isFilesFocused = state.focusArea === "files";
    const isReadmeFocused = state.focusArea === "readme";

    // In root: show both file list and README, each takes half
    // In subfolder: only show file list, takes full height
    const isRoot = state.currentPath === ".";
    const contentHeight = isRoot ? Math.floor((rows - 8) / 2) : rows - 6;

    const header = ui.column({ gap: 0 }, [
        ui.text(`${state.selectedRepo?.owner}/${state.selectedRepo?.repo}`, {
            style: { bold: true, fg: CYAN },
        }),
        ui.text(isRoot ? "Root" : state.currentPath, {
            style: { dim: true },
        }),
        ui.divider(),
    ]);

    const fileListContent = state.repoLoading
        ? ui.spinner({ label: "Loading..." })
        : state.repoError
          ? ui.text(`Error: ${state.repoError}`, { style: { fg: RED } })
          : ui.virtualList({
                id: "file-list",
                items: state.repoFiles,
                itemHeight: 1,
                focusConfig: {
                    contentStyle: { underline: false },
                    style: isFilesFocused ? { bold: true } : {},
                },
                renderItem: (file: FileContent, index: number, focused: boolean) => {
                    const icon = getFileIcon(file);
                    const prefix = focused && isFilesFocused ? "> " : "  ";
                    return ui.text(`${prefix}${icon} ${file.name}`, {
                        key: `file-${index}`,
                        style:
                            focused && isFilesFocused
                                ? { bold: true, fg: file.type === "dir" ? BLUE : undefined }
                                : file.type === "dir"
                                  ? { fg: BLUE }
                                  : {},
                    });
                },
                onSelect: (file: FileContent) => callbacks.openFile(file),
            });

    const fileBox = ui.box({ height: contentHeight, width: cols, border: isFilesFocused ? "single" : undefined }, [
        fileListContent,
    ]);
    // Only show README in root directory
    let readmeElements: Parameters<typeof ui.column>[1] = [];
    const hasReadme = isRoot && state.repoReadme !== null;
    if (hasReadme) {
        const readmeContent = state.repoReadme
            ? wrapLines(he.decode(state.repoReadme), cols)
            : ["No README available."];
        const readmeSection = ui.virtualList({
            id: "readme-content",
            items: readmeContent,
            itemHeight: 1,
            focusConfig: {
                contentStyle: { underline: false },
                style: isReadmeFocused ? { bold: true } : {},
            },
            renderItem: (line: string, index: number, focused: boolean) =>
                ui.text(line || " ", {
                    key: `readme-${index}`,
                    style: focused && isReadmeFocused ? { bold: true } : {},
                }),
        });

        const readmeHeader = ui.row({ gap: 1 }, [ui.text("📖 README", { style: { bold: true, fg: GREEN } })]);

        const readmeBox = ui.box(
            { height: contentHeight, width: cols, border: isReadmeFocused ? "single" : undefined },
            [readmeSection],
        );

        readmeElements = [ui.divider(), readmeHeader, readmeBox];
    }

    const bodyChildren: Parameters<typeof ui.column>[1] = [
        ui.text("📂 Files", { style: { bold: true } }),
        fileBox,
        ...readmeElements,
    ];

    const body = ui.column({ gap: 0 }, bodyChildren);

    const statusBar = ui.statusBar({
        left: [
            ui.kbd("↑↓"),
            ui.text("navigate", { style: { dim: true } }),
            ui.kbd("tab"),
            ui.text("switch pane", { style: { dim: true } }),
            ui.kbd("enter"),
            ui.text("open", { style: { dim: true } }),
        ],
        right: [
            ui.kbd("ctrl+o"),
            ui.text("browser", { style: { dim: true } }),
            ui.kbd("ctrl+h"),
            ui.text("home", { style: { dim: true } }),
            ui.kbd("esc"),
            ui.text("back", { style: { dim: true } }),
        ],
    });

    const pageContent = ui.column({ gap: 0 }, [header, body]);

    return ui.page({
        body: ui.focusTrap(
            {
                id: `repo-trap-${state.focusArea}`,
                active: true,
                initialFocus: isFilesFocused ? "file-list" : "readme-content",
            },
            [pageContent],
        ),
        footer: statusBar,
    });
}

export interface RepoViewCallbacks {
    openFile: (file: FileContent) => void;
}
