import { build } from "esbuild";
import sharp from "sharp";
import { readFile, mkdir, copyFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const plugin = "com.adamperri.soundclouddial.sdPlugin";
await mkdir(`${plugin}/assets`, { recursive: true });
await mkdir("dist", { recursive: true });
await build({ entryPoints: ["src/plugin.ts"], bundle: true, platform: "node", target: "node20", format: "esm", outfile: `${plugin}/bin/plugin.js`, sourcemap: false, banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" } });
const pkg = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(`${plugin}/package.json`, JSON.stringify({ name: pkg.name, version: pkg.version, type: "module", license: "MIT" }, null, 2) + "\n");
await copyFile("LICENSE", `${plugin}/LICENSE`);
await copyFile("PRIVACY.md", `${plugin}/PRIVACY.md`);
await copyFile("README.md", `${plugin}/README.md`);
let notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8");
for (const name of ["@elgato/streamdeck", "@elgato/utils", "@elgato/schemas", "ws", "lucide-static", "pngjs"]) {
  notices += `\n\n## ${name}\n\n` + await readFile(`node_modules/${name}/LICENSE`, "utf8");
}
for (const name of ["NAudio", "dotnet", "dotnet-third-party", "UIAutomation-Interop"]) notices += `\n\n## ${name}\n\n` + await readFile(`licenses/${name}.txt`, "utf8");
await writeFile(`${plugin}/THIRD_PARTY_NOTICES.txt`, notices);

for (const [name, icon, size, color, background] of [
  ["plugin", "disc-3", 256, "#ff6500", "#111214"],
  ["action", "disc-3", 20, "#ffffff", null],
  ["category", "disc-3", 28, "#ffffff", null],
  ["dial", "disc-3", 72, "#ffffff", null],
  ["cover", "disc-3", 72, "#ff6500", "#191b20"],
  ["play", "play", 24, "#ffffff", null],
  ["pause", "pause", 24, "#ffffff", null],
]) {
  const source = (await readFile(`node_modules/lucide-static/icons/${icon}.svg`, "utf8")).replace('stroke="currentColor"', `stroke="${color}"`);
  for (const scale of [1, 2]) {
    let png = sharp(Buffer.from(source)).resize(size * scale, size * scale);
    if (background) png = png.flatten({ background });
    await png.png().toFile(`${plugin}/assets/${name}${scale === 2 ? "@2x" : ""}.png`);
  }
}

await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="192" height="48"><rect width="192" height="48" fill="#111214"/><text x="2" y="34" font-family="Segoe UI, sans-serif" font-size="28" font-weight="bold" fill="white">SoundCloud</text></svg>')).png().toFile(`${plugin}/assets/idle-title.png`);

execFileSync("dotnet", ["publish", "native/CloudDial.Bridge", "-c", "Release", "-r", "win-x64", "--self-contained", "true", "-p:PublishSingleFile=true", "-p:IncludeNativeLibrariesForSelfExtract=true", "-p:DebugType=None", "-p:DebugSymbols=false", "-o", resolve(plugin, "native")], { stdio: "inherit", windowsHide: true });
