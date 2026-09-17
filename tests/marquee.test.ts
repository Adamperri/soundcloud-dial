import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { Marquee, scrollOffset, TITLE_HEIGHT, TITLE_WIDTH } from "../src/marquee.js";

function strip(width: number): string {
  const png = new PNG({ width, height: TITLE_HEIGHT });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = (i / 4) % width % 255;
    png.data[i + 3] = 255;
  }
  return "data:image/png;base64," + PNG.sync.write(png).toString("base64");
}

test("short titles stay still and long titles hold then scroll smoothly", () => {
  assert.equal(scrollOffset(180, 3000), 0);
  assert.equal(scrollOffset(300, 1399), 0);
  assert.equal(scrollOffset(300, 2400), 40);
  assert.equal(scrollOffset(300, 10300), 0);
});
test("marquee pixels wrap to the start after the blank separator", () => {
  const marquee = new Marquee();
  const source = strip(300);
  const first = marquee.frame(source, 0);
  const wrapped = marquee.frame(source, 8900); // 300 px offset: separator then new title.
  const png = PNG.sync.read(Buffer.from(wrapped.slice(22), "base64"));
  assert.equal(png.width, TITLE_WIDTH);
  assert.equal(png.height, TITLE_HEIGHT);
  assert.equal(png.data[0], 17);
  assert.equal(png.data[56 * 4], 0);
  assert.equal(png.data[57 * 4], 1);
  assert.notEqual(wrapped, first);
  assert.equal(marquee.frame(source, 10300), first);
});
test("track changes reset the marquee; missing or malformed rasters recover", () => {
  const marquee = new Marquee();
  const a = strip(300), b = strip(400);
  marquee.frame(a, 0);
  marquee.frame(a, 5000);
  assert.equal(marquee.frame(b, 5000), new Marquee().frame(b, 0));
  assert.equal(marquee.frame(null, 6000), "assets/idle-title.png");
  assert.equal(marquee.frame("data:image/png;base64,INVALID", 7000), "assets/idle-title.png");
});
