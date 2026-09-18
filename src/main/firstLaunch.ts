/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { BrowserWindow } from "electron/main";
import { SplashProps } from "shared/browserWinProperties";

import { createWindows } from "./mainWindow";
import { State } from "./settings";
import { importSettings, writeDesktopSettings } from "./wincordSettings";
import { makeLinksOpenExternally } from "./utils/makeLinksOpenExternally";
import { loadView } from "./vesktopStatic";

interface Data {
    discordBranch: "stable" | "canary" | "ptb";
    minimizeToTray?: "on";
    autoStart?: "on";
    importSettings?: "on";
    richPresence?: "on";
}

export function createFirstLaunchTour() {
    const win = new BrowserWindow({
        ...SplashProps,
        transparent: false,
        frame: true,
        autoHideMenuBar: true,
        height: 550,
        width: 600
    });

    makeLinksOpenExternally(win);

    loadView(win, "first-launch.html");
    win.webContents.addListener("console-message", (_e, _l, msg) => {
        if (msg === "cancel") return app.exit();

        if (!msg.startsWith("form:")) return;
        const data = JSON.parse(msg.slice(5)) as Data;

        State.store.firstLaunch = false;
        writeDesktopSettings({ discordBranch: data.discordBranch, minimizeToTray: !!data.minimizeToTray, richPresence: !!data.richPresence, autoStart: !!data.autoStart });
        if (data.importSettings) importSettings();

        win.close();

        createWindows();
    });
}
