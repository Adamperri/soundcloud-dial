import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { WebSocketServer } from "ws";

// Opt-in integration check: briefly changes volume and pauses/resumes the real app.
const controls = process.argv.includes("--controls");
if (!controls && !process.argv.includes("--display-only")) throw new Error("Pass --controls or --display-only.");
const directory = resolve("com.adamperri.soundclouddial.sdPlugin");
const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
await once(server, "listening");
const info = {
  application: { version: "7.5.1", platform: "windows", platformVersion: "10.0", language: "en" },
  plugin: { version: manifest.Version, uuid: manifest.UUID },
  devices: [{ id: "test-device", name: "Test encoder", type: 12, size: { columns: 3, rows: 4 } }],
  devicePixelRatio: 1, colors: {},
};
const child = spawn(process.execPath, ["bin/plugin.js", "-port", String(server.address().port), "-pluginUUID", "test-instance", "-registerEvent", "registerPlugin", "-info", JSON.stringify(info)], { cwd: directory, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", value => { output += value; });
child.stderr.on("data", value => { output += value; });
const connected = once(server, "connection");
const [socket] = await Promise.race([connected, delay(10000).then(() => { throw new Error("Plugin connection timed out: " + output); })]);
let display = {};
let alerts = 0;
socket.on("message", data => {
  const message = JSON.parse(data);
  if (message.event === "setFeedback") Object.assign(display, message.payload);
  if (message.event === "showAlert") alerts++;
});
function send(event, extra = {}) {
  socket.send(JSON.stringify({ event, action: "com.adamperri.soundclouddial.control", context: "test-dial", device: "test-device", payload: { controller: "Encoder", coordinates: { column: 0, row: 0 }, settings: { volumeStep: 2 }, ...extra } }));
}
async function until(check, label) {
  for (let i = 0; i < 60; i++) { if (check()) return; await delay(150); }
  throw new Error(label + ": " + JSON.stringify({ ...display, artwork: display.artwork ? "present" : null }) + output);
}
let initialVolume;
let initialPlayback;
try {
  send("willAppear");
  await until(() => display.connection === "SOUNDCLOUD" && /^\d+%$/.test(display.level), "No unmuted SoundCloud session");
  assert.ok(display.artwork.startsWith("data:image/png;base64,"), "Live cover artwork missing");
  await mkdir("local", { recursive: true });
  await writeFile("local/current-cover.png", Buffer.from(display.artwork.split(",")[1], "base64"));
  initialVolume = Number.parseInt(display.level);
  initialPlayback = display.playback;
  assert.ok(display.track.startsWith("data:image/png;base64,"), "Rendered title missing");
  assert.equal(display.progress?.enabled, true, "Real track timing unavailable");
  const firstTitle = display.track;
  const firstProgress = display.progress.value;
  await writeFile("local/dial-start.json", JSON.stringify(display));
  await delay(3000);
  assert.notEqual(display.track, firstTitle, "Long title did not scroll");
  if (initialPlayback === "assets/pause.png") assert.ok(display.progress.value > firstProgress, "Progress did not advance");
  await writeFile("local/dial-scrolled.json", JSON.stringify(display));
  if (!controls) {
    console.log("PASS: live artwork, smooth title frames, real song-progress updates; playback and volume untouched.");
  } else {
  const ticks = initialVolume >= 2 ? -1 : 1;
  send("dialRotate", { ticks, pressed: false });
  await until(() => display.level === `${initialVolume + ticks * 2}%`, "Volume turn did not work");
  send("dialRotate", { ticks: -ticks, pressed: false });
  await until(() => display.level === `${initialVolume}%`, "Volume not restored");
  send("dialDown");
  send("dialUp");
  await until(() => display.playback !== initialPlayback, "Playback toggle did not work");
  await delay(500);
  assert.notEqual(display.playback, initialPlayback, "Dial release toggled playback a second time");
  if (display.playback === "assets/play.png") {
    await delay(1100);
    const pausedProgress = display.progress.value;
    await delay(1100);
    assert.equal(display.progress.value, pausedProgress, "Track progress advanced while paused");
  }
  send("dialDown");
  send("dialUp");
  await until(() => display.playback === initialPlayback, "Playback not restored");
  assert.equal(alerts, 0, "Plugin reported a control error");
  console.log("PASS: native artwork, dial volume down/up, press play/pause, no double-toggle, original volume/playback restored.");
  }
} finally {
  // Restore the original state even when an assertion fails midway through.
  if (controls && initialVolume !== undefined && /^\d+%$/.test(display.level) && Number.parseInt(display.level) !== initialVolume) {
    send("dialRotate", { ticks: (initialVolume - Number.parseInt(display.level)) / 2, pressed: false });
    await delay(1000);
  }
  if (controls && initialPlayback && display.playback !== initialPlayback) { send("dialDown"); await delay(1000); }
  send("willDisappear");
  await delay(300);
  socket.close();
  server.close();
  child.kill();
}
