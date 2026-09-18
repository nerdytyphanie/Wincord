# Wincord fork: integration map and upstream upgrades

Updated 2026-09-18. This document describes the current desktop/headless fork,
including changes still uncommitted at the time of writing. It replaces the older
description of a headless-only entry point.

## Baseline and ownership

| Component | Current baseline |
| --- | --- |
| Upstream repository | https://github.com/Vencord/Vesktop |
| Vesktop commit | `303e8c03ce7a65cf3dcccbb9f298119aa085711d` |
| Vencord bundle revision | `59a54286542651fff5ea53f0ce6cadf2a6aa7521` |
| Electron dependency | `43.2.0` in `package.json` |
| Runtime contract | `winhanced-runtime.json`, version `1` |

Wincord provides the Electron application, normal desktop client, hidden startup,
profile selection, and a small host interface. Winhanced owns the loaded extension:
IPC, Discord data/actions, overlay login integration, subscriptions, and GPU video
export. The native controls and video presenter belong to Winhanced too.

The Winhanced extension source is currently in
`../Winhanced/WinhancedOverlay/Discord/Backend/src/`. That sibling location is a
development reference, **not a required runtime location or an instruction to
bundle either project's source into the other**. The host loads a compiled
extension from the path supplied by its parent. Winhanced's extension build does
not require Vesktop or Vencord source.

Both modes use one Wincord Electron application. The desktop mode attaches to the
existing Discord page and media connection; it does not log a second Discord page
into the call to serve the overlay.

## Functional changes in this fork

| File / symbol | What differs from upstream | What an upgrade must preserve |
| --- | --- | --- |
| `headless.cjs` | New package entry point. Sets branding, profile/runtime paths and `global.WincordHost`; selects normal startup or `--headless`; loads the supplied extension. | Default launch must remain the normal client. Headless startup must not import the normal window/tray startup. Preserve the private attachment parameters and single-instance handoff. |
| `package.json` | Entry point, application identity, icons, packaged host/manifest files, and `publish: null`. | Preserve these additions when accepting upstream dependency/build changes. Do not restore upstream update publishing. |
| `src/main/main.ts` | Passes Wincord attachment data through the existing single-instance lock; attaches the extension during desktop startup and on a subsequent overlay connection; exposes settings and selects overlay setup defaults. | Overlay attachment must reuse the running desktop process. Independent startup must retain its first-launch flow. |
| `src/main/wincordSettings.ts` | New shared settings adapter: `readDesktopSettings`, `writeDesktopSettings`, `initializeOverlayDesktop`, and the extracted settings-import implementation. | Continue using upstream Settings, State and autoStart mechanisms rather than creating a separate settings store. Preserve the one-time `wincordOverlaySetup` marker. |
| `src/main/firstLaunch.ts` | Uses the shared settings/import adapter instead of keeping another copy of that logic in the setup form. | The standalone first-run form still applies the user's selections. Overlay startup skips that form through `main.ts`. |
| `src/main/screenShare.ts` / `registerScreenShareHandler` | Accepts an optional source selector, includes `displayId`, and consults `WincordHost.selectCaptureSource` before the normal picker. | An overlay selection uses the existing capture machinery. Without an overlay selection, the ordinary desktop picker must continue to work. Preserve upstream platform-specific handling. |
| `src/main/vencordFilesDir.ts` | Adds `WINCORD_VENCORD_BUNDLE` as the first bundle-directory choice. | The host-provided bundle must take precedence; retain the upstream setting/default fallbacks. |
| `src/main/updater.ts` | Disables automatic upstream checks and opening the upstream updater. | Wincord updates are owned by our release/overlay flow. Do not silently restore upstream checks or downloads. |
| `scripts/build/afterPack.mjs` | Copies `winhanced-runtime.json` beside the packaged executable. | Preserve the existing upstream hook work and the manifest copy. |
| `winhanced-runtime.json` | Declares executable, pinned revisions and support/Vencord bundle paths. | Metadata and paths must describe the artifacts actually shipped. A version bump is a contract change, not just a release-number change. |
| `src/main/utils/makeLinksOpenExternally.ts` | Contains a `WincordHost.windowOpen` override added for the earlier video-popup attempt. | **Currently unused by the replacement video exporter.** It is still present, but is not a requirement of the working video path. Removal would be a separate code change. |

The overlay-launched desktop defaults are stable Discord, start with system,
Rich Presence, settings import, and minimize to tray. The native Social settings
expose start with system and Rich Presence only when desktop mode is enabled;
those overlay controls are implemented in Winhanced, not in this fork. Users can
change minimize-to-tray inside the normal desktop client.

## Host/runtime interface

`headless.cjs` accepts these parent-supplied environment variables:

- `WINHANCED_DISCORD_EXTENSION`: compiled extension module exposing `attachBackend`.
- `WINHANCED_DISCORD_PIPE`: the parent's private named pipe.
- `WINHANCED_DISCORD_SECRET`: per-launch authentication secret. The host retains it
  in attachment data and removes it from the process environment.
- `WINHANCED_DISCORD_PROFILE`: optional explicit profile directory. The default
  on Windows is `%LOCALAPPDATA%\Winhanced\Discord\session`.

The host sets `WINHANCED_DISCORD_RUNTIME` to its runtime root and
`WINCORD_VENCORD_BUNDLE` to its packaged bundle. It sets `userData`, `sessionData`
and `VENCORD_USER_DATA_DIR` before startup. Preserve existing internal identifiers
and saved-profile compatibility; the branding request did not authorize renaming
all Vesktop internals or migrating profiles.

`WincordHost.attach` calls the extension's `attachBackend` with the pipe, secret
and `desktop: !headless`. Desktop startup also supplies the settings adapter.
Capture-source selection is provided by the attached extension when applicable.
The extension owns protocol validation and must not become part of the ordinary
Vesktop renderer/preload bundles by accident.

## Branding changes

The visible product name is **Wincord**, Windows application ID
`com.winhanced.wincord`, and executable `Wincord.exe`. The approved icons use a
purple W and blue C. App and tray artwork are separate assets.

| Area | Files to check after an upstream merge |
| --- | --- |
| Executable/release artwork | `package.json`, `build/wincord.ico`, `build/wincord.svg` |
| Window/splash icons | `static/wincord.ico`, `src/main/mainWindow.ts`, `src/shared/browserWinProperties.ts` |
| Tray artwork/defaults | `static/wincord-tray.ico`, `static/wincord-tray.svg`, `src/main/userAssets.ts`, `src/main/tray.ts` |
| Splash and standalone views | `static/splash.webp`, `static/views/about.html`, `static/views/first-launch.html`, `static/views/splash.html`, `static/views/updater/index.html` |
| Main-process visible strings | `src/main/autoStart.ts`, `src/main/cli.ts`, `src/main/index.ts`, `src/main/main.ts`, `src/main/mainWindow.ts`, `src/main/settings.ts`, `src/main/updater.ts`, `src/main/utils/clearData.ts`, `src/main/utils/steamOS.ts` |
| Renderer visible strings | `src/renderer/index.ts`, `src/renderer/logger.ts`, `src/renderer/components/SimpleErrorBoundary.tsx` |
| Settings labels | `src/renderer/components/settings/AutoStartToggle.tsx`, `DeveloperOptions.tsx`, `OutdatedVesktopWarning.tsx`, `Settings.tsx`, `WindowsTransparencyControls.tsx` |

Vencord naming and upstream copyright/license attribution remain. Internal names
such as `VesktopNative`, existing protocol identifiers and source filenames are
not branding bugs. Reference/preview PNGs in `build/` are design aids, not runtime
dependencies. Check new upstream visible strings as part of a chosen upgrade;
do not perform a blind repository-wide Vesktop-to-Wincord replacement.

## Video: where the working implementation lives

The desktop/tray fix is entirely in Winhanced's extension:

- `src/backend/desktopVideo.ts`: reads the existing received video track using
  `MediaStreamTrackProcessor`, transfers ImageBitmaps through paired MessagePorts,
  and presents them through `bitmaprenderer` canvases. The SharedWorker pairs the
  ports; it does not relay every frame. There is no `VideoFrame.copyTo`, screenshot
  capture or video re-encoding in this implementation.
- `src/backend/main.ts`: creates a fresh, permanently offscreen WebContentsView
  and exports its shared GPU textures through the existing frame/ACK protocol.
- `src/backend/renderer.ts`: selects the existing Discord tracks and starts/stops
  export without stopping those tracks or replacing the desktop player.
- Winhanced's `DiscordVideoSurface.cs` and `SharedVideoPresenter.cs`: native
  presentation of those shared textures.

Do not restore the old desktop-popup exporter: that test had live video in its
document but produced no shared texture frames. The replacement remains active
when the normal desktop window closes to the tray. The existing headless rendering
path remains separate and must also survive upgrades.

Changes to Discord's internal stores/actions mainly affect the Winhanced extension.
Changes to Electron/Chromium can affect track processing, transferable GPU images,
offscreen rendering, shared handles or texture lifetimes even when the Vesktop
source merge is clean. A clean merge alone is not media validation.

## Build and packaging boundary

`pnpm build` / `pnpm build:dev` use the fork's normal
`scripts/build/build.mts` to build its desktop bundles. That script does **not**
build the Winhanced extension or automatically produce all integration support
artifacts. The earlier version of this document incorrectly said otherwise.

A packaged runtime must contain the executable and manifest, packaged host,
desktop bundles/assets, and the support and Vencord bundle directories named in
the manifest. The extension currently loads the compiled `support/main.cjs`
interface, including `IpcEvents`, `BrowserUserAgent` and
`registerScreenShareHandler`. Rebuild/version-match those support artifacts when
their upstream inputs change; an old populated `dist/` is not evidence of a
reproducible release build. Developer dependency junctions are not release assets.

The manifest's presence beside the executable is handled by `afterPack.mjs`.
Winhanced builds/distributes its own extension separately and locates the runtime
through that manifest. Production single-EXE download/update packaging is a
separate deliverable; this document does not assert it is complete.

## Checklist for a deliberately selected upstream upgrade

1. Record the current fork revision, upstream base and manifest revisions. Commit
   authorized work before the upgrade so the existing patch set remains recoverable
   through Git. Keep branding and functional host changes distinguishable in review.
2. Compare the chosen upstream revision against the functional files above. Pay
   particular attention to startup order, single-instance handling, first-run state,
   the screen-share handler and updater behavior. Preserve new upstream fixes while
   reapplying these specific hooks; do not replace entire files with old copies.
3. Reconcile dependency/lockfile changes using the repository's supported toolchain.
   Build the desktop fork and required runtime support/bundle artifacts. Build the
   Winhanced extension separately. Verify manifest paths against the release layout.
4. Test independent first launch with a disposable profile: branded setup appears;
   normal desktop settings, picker and tray behavior still work. Separately test
   overlay-launched setup defaults without overwriting an existing user's profile.
5. Test desktop attachment to both a newly launched and an already running client.
   Test headless startup for absence of windows/tray icons, saved login, private-pipe
   authentication, server/channel data and normal detach/shutdown behavior.
6. In an explicitly authorized test server, validate message send/edit, emoji,
   GIF/media attachment, voice connection, ordinary desktop capture picker,
   overlay-selected capture, and stream mute independently of Deafen.
7. Validate incoming video in the actual WinUI presenter with the desktop visible,
   closed to the tray and restored. Verify the desktop video still plays and the
   call is not duplicated. Repeat the existing headless shared-texture check.
8. Record results and any untested paths in Winhanced's
   `Discord/Backend/docs/backend-integration-validation.md`; update this map and the
   pinned manifest revisions to describe what actually shipped. Publishing and
   deployment require the user's separate authorization.

## Latest video evidence

On 2026-09-18 the actual WinUI presenter passed the desktop/tray check:
`framesPresented: 600`, `desktopFrames: 300`, `trayFrames: 300`, `error: null`.
The tester posted WM_CLOSE to exercise normal close-to-tray behavior and verified
that the second group of frames arrived while the desktop window was not visible.
Evidence is in Winhanced's
`Testing/DiscordBackend/artifacts/desktop-live-video.json` and the integration
validation document. This is not a claim of complete Discord feature parity,
live multi-camera validation, or completion of the native overlay layout.
