# Wincord

Wincord is a Discord desktop client with an optional headless mode, based on
[Vesktop](https://github.com/Vencord/Vesktop) and
[Vencord](https://github.com/Vendicated/Vencord).

## Desktop mode

Launch `Wincord.exe` to use the normal desktop client:

- Servers, channels, direct messages, friends, reactions, emoji, GIFs, and stickers.
- Voice calls, incoming streams and webcams, and screen sharing.
- Vencord plugins, themes, and customization.
- A system tray icon and a minimize-to-tray option.
- Optional startup with Windows and Rich Presence support.
- First-run setup when launched independently, including settings import.
- Separate application and tray icons with Wincord branding.

An external integration can attach to the running desktop client and use its
existing Discord session. Closing the window to the tray keeps the client
running when minimize-to-tray is enabled.

## Headless mode and integrations

The `--headless` switch starts a hidden host for an application-supplied
integration. It does not open the normal desktop window or first-run setup form.
Headless startup requires a compatible extension and a private IPC connection;
the switch alone is not a standalone background-client setup.

The host provides profile selection, extension loading, single-instance
attachment, desktop settings access, and integration with the existing screen
capture machinery. A compatible extension can expose Discord data and actions,
login flows, and received video to an external interface. Those integration
features require the extension; they are not a separate interface bundled with
this repository.

Desktop and headless modes use the same profile by default. An integrating
application can supply a different profile and manage startup, mode changes,
and updates.

## Windows runtime package

The Windows x64 runtime archive, `Wincord-1.6.7-wincord.3-win-x64.7z`, contains the
executable, Electron runtime, application assets, and all language packs.
Extract the complete archive into one directory before launching `Wincord.exe`.
Electron does not need to be installed separately.

An integrating application can download and extract this archive silently using
its own extraction component. Preserve user profiles and session data when
replacing the runtime.

Automatic Vesktop updater checks are disabled. Updates are delivered through
Wincord releases or managed by the integrating application.

## Source and builds

The project uses Node.js 22 or newer and pnpm 11 or newer. Use the pnpm version
declared in `package.json`.

~~~sh
pnpm install --frozen-lockfile
pnpm build
~~~

The build downloads the latest prebuilt Vencord release using the same downloader
as upstream Vesktop. It also compiles the three support bundles from the source
in this repository: the main-process interface, native preload bridge, and
audio/video capture-constraint fixes. No Vencord source checkout or pre-populated
build-output directory is required.

To package the Windows x64 runtime after building:

~~~sh
pnpm exec electron-builder --win --x64 --dir
~~~

The complete runtime is written to `dist/win-unpacked`. Archive that directory
with 7-Zip to produce the downloadable `.7z`; retain all of its language packs
and runtime files. The existing `pnpm package` command retains upstream platform
packaging targets.

`pnpm fetch:vencord` downloads the Vencord assets without building the rest of
the app. Their release URL and SHA-256 hashes are recorded in the generated
bundle manifest. Since upstream release tags can change, builds at different
times may include different Vencord assets.

Vencord source is unmodified. Compiled support files, downloaded Vencord assets,
and dependencies remain build outputs and are not committed to this repository.

## Upstream and licensing

Wincord retains upstream copyright notices and uses the
[GPL-3.0-or-later license](LICENSE). Vencord and Electron retain their own
licenses and attribution. Windows is the current packaged integration target;
upstream platform build definitions remain in the repository.
