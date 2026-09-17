export type MediaState = {
  connected: boolean;
  title: string;
  artist: string;
  playback: string;
  canToggle: boolean;
  volume: number | null;
  muted: boolean;
  artwork: string | null;
};

export const offline: MediaState = {
  connected: false, title: "Open SoundCloud", artist: "Desktop app", playback: "Stopped",
  canToggle: false, volume: null, muted: false, artwork: null,
};

export function parseState(value: unknown): MediaState {
  if (!value || typeof value !== "object") throw new Error("Invalid media state");
  const s = value as MediaState;
  if (typeof s.connected !== "boolean" || typeof s.title !== "string" || typeof s.artist !== "string" ||
      typeof s.playback !== "string" || typeof s.canToggle !== "boolean" || typeof s.muted !== "boolean" ||
      !(s.volume === null || (Number.isInteger(s.volume) && s.volume >= 0 && s.volume <= 100)) ||
      !(s.artwork === null || (typeof s.artwork === "string" && s.artwork.length < 200000 && s.artwork.startsWith("data:image/png;base64,")))) {
    throw new Error("Invalid media state");
  }
  return s;
}

export function volumeDelta(ticks: unknown, step: unknown = 2): number {
  if (typeof ticks !== "number" || !Number.isFinite(ticks)) return 0;
  const increment = typeof step === "number" && Number.isInteger(step) && step >= 1 && step <= 10 ? step : 2;
  return Math.max(-100, Math.min(100, Math.trunc(ticks) * increment));
}

function label(value: string): string {
  return [...value.replace(/[\u0000-\u001f\u007f]/g, " ")].slice(0, 160).join("");
}

export function feedback(s: MediaState): Record<string, string | number> {
  return {
    artwork: s.artwork || "assets/cover.png",
    track: label(s.title) || "SoundCloud",
    artist: label(s.artist),
    playback: s.playback === "Playing" ? "assets/pause.png" : "assets/play.png",
    level: s.volume === null ? "--" : s.muted ? "MUTE" : `${s.volume}%`,
    meter: s.muted ? 0 : s.volume ?? 0,
    connection: s.connected ? "SOUNDCLOUD" : "NOT CONNECTED",
  };
}

export function changedFeedback(next: Record<string, string | number>, previous: Record<string, string | number> = {}) {
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => previous[key] !== value));
}
