import streamDeck, { action, SingletonAction, type DialAction, type DialDownEvent, type DialRotateEvent, type TouchTapEvent, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import { Bridge } from "./bridge.js";
import { changedFeedback, feedback, volumeDelta } from "./state.js";

type Settings = { volumeStep?: number };
const bridge = new Bridge();

@action({ UUID: "com.adamperri.soundclouddial.control" })
class SoundCloudDial extends SingletonAction<Settings> {
  private visible = new Map<string, DialAction<Settings>>();
  private rendered = new Map<string, Record<string, string | number>>();
  private rotations = new Map<string, { delta: number; timer: NodeJS.Timeout; dial: DialAction<Settings> }>();

  constructor() {
    super();
    bridge.on("state", () => void this.render());
  }

  override async onWillAppear(ev: WillAppearEvent<Settings>) {
    if (!ev.action.isDial()) return;
    this.visible.set(ev.action.id, ev.action);
    this.rendered.delete(ev.action.id);
    await ev.action.setFeedbackLayout("layouts/player.json");
    bridge.start();
    await this.render();
  }

  override onWillDisappear(ev: WillDisappearEvent<Settings>) {
    this.visible.delete(ev.action.id);
    this.rendered.delete(ev.action.id);
    const rotation = this.rotations.get(ev.action.id);
    if (rotation) clearTimeout(rotation.timer);
    this.rotations.delete(ev.action.id);
    if (!this.visible.size) bridge.stop();
  }

  private async render() {
    const next = feedback(bridge.state);
    for (const [id, dial] of this.visible) {
      const changes = changedFeedback(next, this.rendered.get(id));
      if (!Object.keys(changes).length) continue;
      this.rendered.set(id, next);
      try { await dial.setFeedback(changes); }
      catch { this.rendered.delete(id); }
    }
  }

  private async command(dial: DialAction<Settings>, command: "toggle" | "volume", delta = 0) {
    try { await bridge.request(command, delta); }
    catch {
      streamDeck.logger.warn(`SoundCloud ${command} unavailable; waiting for app.`);
      await dial.showAlert();
    }
  }

  override onDialDown(ev: DialDownEvent<Settings>) {
    return this.command(ev.action, "toggle");
  }

  override onTouchTap(ev: TouchTapEvent<Settings>) {
    return this.command(ev.action, "toggle");
  }

  override onDialRotate(ev: DialRotateEvent<Settings>) {
    const delta = volumeDelta(ev.payload.ticks, ev.payload.settings.volumeStep);
    if (!delta) return;
    const current = this.rotations.get(ev.action.id);
    if (current) {
      current.delta = Math.max(-100, Math.min(100, current.delta + delta));
      return;
    }
    const rotation = {
      delta, dial: ev.action,
      timer: setTimeout(() => {
        this.rotations.delete(ev.action.id);
        if (rotation.delta) void this.command(rotation.dial, "volume", rotation.delta);
      }, 40),
    };
    this.rotations.set(ev.action.id, rotation);
  }
}

streamDeck.actions.registerAction(new SoundCloudDial());
process.once("exit", () => bridge.stop());
process.once("SIGTERM", () => { bridge.stop(); process.exit(0); });
await streamDeck.connect();
