import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const file = "com.adamperri.soundclouddial.streamDeckPlugin";
const hash = createHash("sha256").update(await readFile(`dist/${file}`)).digest("hex");
await writeFile("dist/SHA256SUMS.txt", `${hash}  ${file}\n`);
console.log(`${hash}  ${file}`);
