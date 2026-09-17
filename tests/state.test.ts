import { test } from "node:test";
import assert from "node:assert/strict";
import { changedFeedback, feedback, offline, parseState, volumeDelta } from "../src/state.js";

test("dial ticks use bounded, valid volume increments", () => {
  assert.equal(volumeDelta(3), 6);
  assert.equal(volumeDelta(-2, 5), -10);
  assert.equal(volumeDelta(200, 10), 100);
  assert.equal(volumeDelta(-200, 10), -100);
  assert.equal(volumeDelta(NaN), 0);
  assert.equal(volumeDelta(1, -5), 2);
  assert.equal(volumeDelta(1, 100), 2);
});
test("offline clears old art and shows unknown volume", () => {
  const value = feedback(offline);
  assert.equal(value.artwork, "assets/cover.png");
  assert.equal(value.level, "--");
  assert.equal(value.meter, 0);
});
test("muting and play/pause update correctly", () => {
  const playing = feedback({ ...offline, connected: true, playback: "Playing", volume: 35, muted: true });
  assert.equal(playing.playback, "assets/pause.png");
  assert.equal(playing.level, "MUTE");
  assert.equal(playing.meter, 0);
});
test("does not resend unchanged artwork on volume updates", () => {
  const previous = feedback({ ...offline, volume: 20 });
  const changes = changedFeedback(feedback({ ...offline, volume: 22 }), previous);
  assert.deepEqual(changes, { level: "22%", meter: 22 });
});
test("untrusted metadata cannot escape the protocol or supply remote artwork", () => {
  assert.deepEqual(parseState(offline), offline);
  for (const bad of [{ ...offline, volume: 101 }, { ...offline, volume: 2.1 }, { ...offline, artwork: "https://example.com/art.png" }, null]) {
    assert.throws(() => parseState(bad));
  }
  assert.equal(feedback({ ...offline, artist: "a\nb" }).artist, "a b");
});

test("song progress is real, bounded, and hidden when timing is absent", () => {
  assert.deepEqual(feedback(offline).progress, { value: 0, enabled: false });
  assert.deepEqual(feedback({ ...offline, connected: true, positionSeconds: 60, durationSeconds: 240 }).progress, { value: 25, enabled: true });
  assert.deepEqual(feedback({ ...offline, connected: true, positionSeconds: 300, durationSeconds: 240 }).progress, { value: 100, enabled: true });
  assert.throws(() => parseState({ ...offline, durationSeconds: -1 }));
});
