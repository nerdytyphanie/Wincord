/* SPDX-License-Identifier: GPL-3.0-or-later */
const { app } = require("electron");
const { join } = require("node:path");
app.setName("Wincord");
if (process.platform === "win32") app.setAppUserModelId("com.winhanced.wincord");
const headless = process.argv.includes("--headless");
const profile = process.env.WINHANCED_DISCORD_PROFILE || join(process.env.LOCALAPPDATA || app.getPath("appData"), "Winhanced", "Discord", "session");
app.setPath("userData", profile);
app.setPath("sessionData", join(profile, "sessionData"));
process.env.VENCORD_USER_DATA_DIR = profile;
process.env.WINHANCED_DISCORD_RUNTIME = __dirname;
process.env.WINCORD_VENCORD_BUNDLE = join(__dirname, "dist", "js", "vencord");
function fail(error) { console.error("[Wincord]", error.message); if (headless) app.exit(1); }
process.on("uncaughtException", fail);
process.on("unhandledRejection", fail);
global.WincordHost = {
    headless,
    attachment: {
        pipe: process.env.WINHANCED_DISCORD_PIPE,
        secret: process.env.WINHANCED_DISCORD_SECRET,
        extension: process.env.WINHANCED_DISCORD_EXTENSION
    },
    attach(options) {
        if (!options?.pipe || !options?.extension) return;
        try { require(options.extension).attachBackend({ ...options, desktop: !headless }); }
        catch (error) { fail(error); }
    }
};
delete process.env.WINHANCED_DISCORD_SECRET;
if (headless) {
    if (!global.WincordHost.attachment.pipe) throw new Error("Headless mode requires the overlay connection");
    if (app.requestSingleInstanceLock({ wincord: global.WincordHost.attachment })) {
        app.on("second-instance", (_event, _args, _cwd, data) => global.WincordHost.attach(data.wincord));
        global.WincordHost.attach(global.WincordHost.attachment);
    } else app.quit();
} else {
    require("./dist/js/main.js");
}
