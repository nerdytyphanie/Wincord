import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

async function load(entry: string, fixture: any, modules: Record<string, string>) {
    const result = await build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs",
        plugins: [{ name: "runtime-fixtures", setup(builder) {
            builder.onResolve({ filter: /.*/ }, args => modules[args.path] ? { path: args.path, namespace: "fixture" } : undefined);
            builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: modules[args.path], loader: "js" }));
        }}] });
    const module = { exports: {} as any };
    new Function("require", "module", "exports", "fixture", result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports, fixture);
    return module.exports;
}

test("importing headless capture IPC installs no desktop resolver; desktop requests still resolve", async () => {
    const listeners: Function[] = []; const sent: any[] = [];
    const fixture = { ipcMain: { on: (_: string, fn: Function) => listeners.push(fn) },
        mainWin: { isDestroyed: () => false, webContents: { send: (_: string, value: any) => sent.push(value) } } };
    const api = await load("src/main/ipcCommands.ts", fixture, {
        electron: "export const ipcMain=fixture.ipcMain;",
        "shared/IpcEvents": "export const IpcEvents={IPC_COMMAND:'command'};",
        "./mainWindow": "export const mainWin=fixture.mainWin;"
    });
    assert.equal(listeners.length, 0);
    const first = api.sendRendererCommand("languages");
    assert.equal(listeners.length, 1);
    listeners[0]({}, { nonce: "overlay-request", ok: true, data: {} });
    listeners[0]({}, { nonce: sent[0].nonce, ok: true, data: ["en"] });
    assert.deepEqual(await first, ["en"]);
    const second = api.sendRendererCommand("languages");
    assert.equal(listeners.length, 1);
    listeners[0]({}, { nonce: sent[1].nonce, ok: false, data: "expected" });
    await assert.rejects(second, error => error === "expected");
});

test("disabling startup clears saved intent, Windows aliases and reported machine entry", async () => {
    const writes: any[] = [], registry: any[] = [];
    let enabled = true;
    const fixture = { State: { store: {} }, Settings: { store: {}, addChangeListener() {} },
        app: {
            getLoginItemSettings: () => ({ openAtLogin: enabled, executableWillLaunchAtLogin: enabled,
                launchItems: [{ name: "old-wincord-name", scope: "user" }, { name: "machine-wincord", scope: "machine" }] }),
            setLoginItemSettings: (settings: any) => { writes.push(settings); enabled = settings.openAtLogin; }
        }, execFileSync: (...args: any[]) => registry.push(args) };
    const api = await load("src/main/autoStart.ts", fixture, {
        electron: "export const app=fixture.app;", child_process: "export const execFileSync=fixture.execFileSync;",
        "./constants": "export const IS_FLATPAK=false;", "./dbus": "export const requestBackground=()=>false;",
        "./settings": "export const Settings=fixture.Settings; export const State=fixture.State;"
    });
    api.autoStart.disable();
    assert.equal((fixture.State.store as any).wincordAutoStartEnabled, false);
    assert.equal(api.autoStart.isEnabled(), false);
    assert.deepEqual(writes.filter(w => w.name).map(w => w.name), ["Wincord", "com.winhanced.wincord", "old-wincord-name", "machine-wincord"]);
    assert.equal(registry.length, 1);
    assert.ok(registry[0][1].includes("machine-wincord"));
});
