import { addAssetsCar } from "./addAssetsCar.mjs";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";

export default async function afterPack(context) {
    await addAssetsCar(context);
    await copyFile(join(context.packager.projectDir, "winhanced-runtime.json"), join(context.appOutDir, "winhanced-runtime.json"));
}
