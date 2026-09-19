import { addAssetsCar } from "./addAssetsCar.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export default async function afterPack(context) {
    await addAssetsCar(context);
    const root = context.packager.projectDir;
    const manifest = JSON.parse(await readFile(join(root, "winhanced-runtime.json"), "utf8"));
    const vencord = JSON.parse(await readFile(join(root, "dist/js/vencord/manifest.json"), "utf8"));
    manifest.vencord = vencord.release;
    manifest.release = JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;
    await writeFile(join(context.appOutDir, "winhanced-runtime.json"), JSON.stringify(manifest, null, 2) + "\n");
}
