import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { offline, parseState, type MediaState } from "./state.js";

type Pending = { resolve: (state: MediaState) => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

export class Bridge extends EventEmitter {
  private child?: ChildProcessWithoutNullStreams;
  private pending = new Map<string, Pending>();
  private sequence = 0;
  private buffer = "";
  private poll?: NodeJS.Timeout;
  private stopped = true;
  private nextStart = 0;
  state: MediaState = offline;

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.poll = setInterval(() => void this.refresh(), 1000);
    void this.refresh();
  }

  private ensureProcess() {
    if (this.child) return;
    if (this.stopped || Date.now() < this.nextStart) throw new Error("Media bridge reconnecting");
    this.buffer = "";
    const child = spawn(resolve("native/CloudDial.Bridge.exe"), [], { windowsHide: true, stdio: "pipe" });
    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (this.child !== child) return;
      this.buffer += chunk;
      if (this.buffer.length > 1024 * 1024) return this.fail("Media bridge response too large");
      let end;
      while ((end = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end + 1);
        this.receive(line);
      }
    });
    // Diagnostics deliberately exclude track names, artwork and local paths.
    child.stderr.resume();
    child.stdin.on("error", () => { if (this.child === child) this.fail("Media bridge disconnected"); });
    child.on("error", () => { if (this.child === child) this.fail("Media bridge could not start"); });
    child.on("exit", () => { if (this.child === child) this.fail("Media bridge stopped"); });
  }

  private receive(line: string) {
    try {
      const message = JSON.parse(line);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      if (message.ok !== true) {
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        pending.reject(new Error(typeof message.error === "string" ? message.error : "Media command failed"));
        return;
      }
      const state = parseState(message.state);
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      this.state = state;
      this.emit("state", state);
      pending.resolve(state);
    } catch { this.fail("Invalid media bridge response"); }
  }

  private fail(reason: string) {
    const child = this.child;
    this.child = undefined;
    child?.kill();
    this.nextStart = Date.now() + 3000;
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(reason));
    }
    this.pending.clear();
    this.state = { ...offline, title: this.stopped ? "Open SoundCloud" : "Reconnecting", artist: "SoundCloud" };
    this.emit("state", this.state);
  }

  async request(command: "snapshot" | "toggle" | "volume", delta = 0): Promise<MediaState> {
    this.ensureProcess();
    if (this.pending.size >= 16) throw new Error("Media bridge busy");
    const id = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail("Media command timed out"), 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.child!.stdin.write(JSON.stringify({ id, command, delta }) + "\n");
    });
  }

  private async refresh() {
    if (this.pending.size || this.stopped) return;
    try { await this.request("snapshot"); } catch { /* Next poll reconnects; never replay user commands. */ }
  }

  stop() {
    this.stopped = true;
    clearInterval(this.poll);
    this.fail("Media bridge closed");
    this.nextStart = 0;
  }
}
