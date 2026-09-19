/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { stripIndent } from "shared/utils/text";

import { IS_FLATPAK } from "./constants";
import { requestBackground } from "./dbus";
import { Settings, State } from "./settings";
import { escapeDesktopFileArgument } from "./utils/desktopFileEscape";

interface AutoStart {
    isEnabled(): boolean;
    enable(): void;
    disable(): void;
}

function getEscapedCommandLine() {
    const args = process.argv.map(escapeDesktopFileArgument);
    if (Settings.store.autoStartMinimized) args.push("--start-minimized");
    return args;
}

function makeAutoStartLinuxDesktop(): AutoStart {
    const configDir = process.env.XDG_CONFIG_HOME || join(process.env.HOME!, ".config");
    const dir = join(configDir, "autostart");
    const file = join(dir, "vesktop.desktop");

    return {
        isEnabled: () => existsSync(file),
        enable() {
            const desktopFile = stripIndent`
                [Desktop Entry]
                Type=Application
                Name=Wincord
                Comment=Wincord autostart script
                Exec=${getEscapedCommandLine().join(" ")}
                StartupNotify=false
                Terminal=false
                Icon=vesktop
            `;

            mkdirSync(dir, { recursive: true });
            writeFileSync(file, desktopFile);
        },
        disable: () => rmSync(file, { force: true })
    };
}

function makeAutoStartLinuxPortal() {
    return {
        isEnabled: () => State.store.linuxAutoStartEnabled === true,
        enable() {
            const success = requestBackground(true, getEscapedCommandLine());
            if (success) {
                State.store.linuxAutoStartEnabled = true;
            }
            return success;
        },
        disable() {
            const success = requestBackground(false, []);
            if (success) {
                State.store.linuxAutoStartEnabled = false;
            }
            return success;
        }
    };
}

const autoStartWindowsMac: AutoStart = {
    isEnabled: () => {
        const { openAtLogin, executableWillLaunchAtLogin } = app.getLoginItemSettings();
        // Windows only reports openAtLogin as true when queried with the same args set in enable()
        return openAtLogin || executableWillLaunchAtLogin;
    },
    enable: () => {
        app.setLoginItemSettings({
            openAtLogin: true,
            args: Settings.store.autoStartMinimized ? ["--start-minimized"] : []
        });
        (State.store as any).wincordAutoStartEnabled = true;
    },
    disable: () => {
        // Clear every registration Electron reports for this executable, not
        // only the current app-name/argument combination. Include old Wincord
        // names so registrations from earlier runtime locations are removed.
        const entries = process.platform === "win32" ? app.getLoginItemSettings().launchItems : [];
        app.setLoginItemSettings({ openAtLogin: false });
        if (process.platform === "win32") {
            for (const name of new Set(["Wincord", "com.winhanced.wincord", ...entries.map(item => item.name)]))
                app.setLoginItemSettings({ openAtLogin: false, name });
            // Electron's setter removes per-user entries. Machine-wide entries
            // it reports need removal from the corresponding Windows Run key.
            for (const entry of entries.filter(item => item.scope === "machine"))
                execFileSync(join(process.env.SystemRoot!, "System32", "reg.exe"),
                    ["delete", "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", entry.name, "/f"], { windowsHide: true });
        }
        (State.store as any).wincordAutoStartEnabled = false;
        if (autoStartWindowsMac.isEnabled()) throw new Error("Windows still has an enabled Wincord startup entry");
    }
};

// The portal call uses the app id by default, which is org.chromium.Chromium, even in packaged Vesktop.
// This leads to an autostart entry named "Chromium" instead of "Vesktop".
// Thus, only use the portal inside Flatpak, where the app is actually correct.
// Maybe there is a way to fix it outside of flatpak, but I couldn't figure it out.
export const autoStart =
    process.platform !== "linux"
        ? autoStartWindowsMac
        : IS_FLATPAK
          ? makeAutoStartLinuxPortal()
          : makeAutoStartLinuxDesktop();

Settings.addChangeListener("autoStartMinimized", () => {
    if (!autoStart.isEnabled()) return;

    autoStart.enable();
});
