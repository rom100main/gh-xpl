import { ui } from "@rezi-ui/core";

import { CYAN, RED } from "../colors.js";
import { parseAndWrapMarkdown, type MdToken } from "../markdown.js";
import type { TuiState } from "../state.js";
import { wrapLines } from "../utils.js";

export function fileView(state: TuiState) {
    const cols = process.stdout.columns ?? 80;
    const isMarkdown = state.currentPath.endsWith(".md");
    const maxCols = cols - 1; // 1 char reserved for cursor

    const header = ui.column({ gap: 0 }, [
        ui.text(`${state.selectedRepo?.owner}/${state.selectedRepo?.repo}`, {
            style: { bold: true, fg: CYAN },
        }),
        ui.text(state.currentPath, { style: { dim: true } }),
        ui.divider(),
    ]);

    const fileItems =
        state.fileContent !== null
            ? isMarkdown
                ? parseAndWrapMarkdown(state.fileContent, maxCols)
                : wrapLines(state.fileContent, maxCols).map((line) => [{ text: line || " ", style: {} }])
            : [];

    const content = state.fileLoading
        ? ui.spinner({ label: "Loading file..." })
        : state.fileContent === null
          ? ui.text("Failed to load file content.", { style: { fg: RED } })
          : ui.virtualList({
                id: "file-content",
                items: fileItems,
                itemHeight: 1,
                focusConfig: { contentStyle: { underline: false } },
                renderItem: (tokens: MdToken[], index: number, focused: boolean) => {
                    const cursor = focused ? "█" : " ";
                    return ui.row({ gap: 0, key: String(index) }, [
                        ui.text(cursor),
                        ...tokens.map((t, i) => ui.text(t.text, { key: `t-${i}`, style: t.style })),
                    ]);
                },
            });

    const statusBar = ui.statusBar({
        left: [ui.kbd("↑↓"), ui.text("scroll", { style: { dim: true } })],
        right: [
            ui.kbd("ctrl+o"),
            ui.text("browser", { style: { dim: true } }),
            ui.kbd("ctrl+h"),
            ui.text("home", { style: { dim: true } }),
            ui.kbd("esc"),
            ui.text("back", { style: { dim: true } }),
        ],
    });

    return ui.page({
        body: ui.focusTrap({ id: "file-trap", active: true, initialFocus: "file-content" }, [
            ui.column({ gap: 0 }, [header, content]),
        ]),
        footer: statusBar,
    });
}
