import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feedback, offline } from "../src/state.js";

const root = new URL("../com.adamperri.soundclouddial.sdPlugin/", import.meta.url);
const layout = JSON.parse(readFileSync(new URL("layouts/player.json", root), "utf8"));
test("all dial items fit in the 200x100 canvas without same-layer overlaps", () => {
  for (const a of layout.items) {
    const [x, y, w, h] = a.rect;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 200 && y + h <= 100, a.key);
    for (const b of layout.items) {
      if (a === b || a.zOrder !== b.zOrder) continue;
      const [bx, by, bw, bh] = b.rect;
      assert.ok(x + w <= bx || bx + bw <= x || y + h <= by || by + bh <= y, `${a.key}/${b.key} overlap`);
    }
  }
});
test("every feedback item has a unique non-reserved layout key", () => {
  const keys = layout.items.map((item: { key: string }) => item.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of Object.keys(feedback(offline))) assert.ok(keys.includes(key), key);
  assert.ok(!keys.includes("icon") && !keys.includes("title"));
});
