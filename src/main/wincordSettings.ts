/* SPDX-License-Identifier: GPL-3.0-or-later */
import { app } from "electron";
import { copyFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { autoStart } from "./autoStart";
import { DATA_DIR } from "./constants";
import { Settings, State } from "./settings";

// Shared by the original first-run form and the overlay's native controls.
export function importSettings() {
    const from = join(app.getPath("userData"), "..", "Vencord", "settings");
    const to = join(DATA_DIR, "settings");
    try {
        const files = readdirSync(from);
        mkdirSync(to, { recursive: true });
        for (const file of files) copyFileSync(join(from, file), join(to, file));
        return { imported: true, files: files.length };
    } catch (error: any) {
        if (error.code === "ENOENT") return { imported: false, files: 0 };
        throw error;
    }
}
export function readDesktopSettings() {
    return { discordBranch: Settings.store.discordBranch, autoStart: autoStart.isEnabled(),
        richPresence: Settings.store.arRPC, minimizeToTray: Settings.store.minimizeToTray,
        importSettings: (State.store as any).wincordImportSettings ?? true };
}
export function writeDesktopSettings(data: Record<string, any>) {
    if (data.discordBranch !== undefined) {
        if (!["stable", "canary", "ptb"].includes(data.discordBranch)) throw new Error("Invalid Discord branch");
        Settings.store.discordBranch = data.discordBranch;
    }
    if (typeof data.minimizeToTray === "boolean") Settings.store.minimizeToTray = data.minimizeToTray;
    if (typeof data.richPresence === "boolean") Settings.store.arRPC = data.richPresence;
    if (typeof data.autoStart === "boolean") autoStart[data.autoStart ? "enable" : "disable"]();
    if (typeof data.importSettings === "boolean") {
        if (data.importSettings && (State.store as any).wincordImportSettings !== true) importSettings();
        (State.store as any).wincordImportSettings = data.importSettings;
    }
    return readDesktopSettings();
}
export function initializeOverlayDesktop() {
    if ((State.store as any).wincordOverlaySetup) return;
    writeDesktopSettings({ discordBranch: "stable", autoStart: true, richPresence: true,
        minimizeToTray: true, importSettings: true });
    (State.store as any).wincordOverlaySetup = true;
}
