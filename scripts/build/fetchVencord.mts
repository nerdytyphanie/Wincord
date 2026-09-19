/* SPDX-License-Identifier: GPL-3.0-or-later */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const destination = join(root, "dist/js/vencord");

export async function fetchVencord() {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    // Reuse the desktop downloader without importing Electron or reading a user profile.
    const bundled = await build({
        absWorkingDir: root,
        entryPoints: ["src/main/utils/vencordLoader.ts"],
        bundle: true,
        platform: "node",
        format: "esm",
        write: false,
        plugins: [{
            name: "build-only-vencord-paths",
            setup(builder) {
                builder.onResolve({ filter: /(?:vencordFilesDir|constants)$/ }, args => {
                    if (!args.importer.replaceAll("\\", "/").endsWith("/src/main/utils/vencordLoader.ts")) return;
                    return { path: args.path, namespace: "build-vencord" };
                });
                builder.onLoad({ filter: /.*/, namespace: "build-vencord" }, args => ({
                    contents: args.path.endsWith("vencordFilesDir")
                        ? `export const VENCORD_FILES_DIR = ${JSON.stringify(destination)};`
                        : `export const USER_AGENT = ${JSON.stringify(`Wincord/${pkg.version}`)};`
                }));
            }
        }]
    });
    const loader = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString("base64")}`);
    await mkdir(destination, { recursive: true });
    const release = await loader.downloadVencordFiles();
    if (!await loader.isValidVencordInstall(destination))
        throw new Error("The downloaded Vencord release is missing required runtime files.");
    const sha256 = Object.fromEntries(await Promise.all(loader.FILES_TO_DOWNLOAD.map(async (name: string) => [
        name, createHash("sha256").update(await readFile(join(destination, name))).digest("hex")
    ])));
    await writeFile(join(destination, "manifest.json"), JSON.stringify({
        release: release.tag_name,
        source: release.html_url,
        independentUpdates: false,
        sha256
    }, null, 2) + "\n");
    console.log(`Fetched Vencord ${release.tag_name} into dist/js/vencord`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    await fetchVencord();
