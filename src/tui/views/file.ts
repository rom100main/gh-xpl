import { ui } from "@rezi-ui/core";

import type { TuiState } from "../state.js";
import { CYAN, RED } from "../colors.js";
import { wrapLines } from "../utils.js";

export function fileView(state: TuiState) {
    const cols = process.stdout.columns ?? 80;

    const header = ui.column({ gap: 0 }, [
        ui.text(`${state.selectedRepo?.owner}/${state.selectedRepo?.repo}`, {
            style: { bold: true, fg: CYAN },
        }),
        ui.text(state.currentPath, { style: { dim: true } }),
        ui.divider(),
    ]);

    const content = state.fileLoading
        ? ui.spinner({ label: "Loading file..." })
        : state.fileContent === null
          ? ui.text("Failed to load file content.", { style: { fg: RED } })
          : ui.virtualList({
                id: "file-content",
                items: wrapLines(state.fileContent, cols),
                itemHeight: 1,
                focusConfig: { contentStyle: { underline: false } },
                renderItem: (line: string, index: number, focused: boolean) =>
                    ui.text(line || " ", {
                        key: String(index),
                        style: focused ? { bold: true } : {},
                    }),
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
