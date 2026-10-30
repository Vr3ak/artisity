// Run: node --test lib/upload.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { fitWithin } from "./upload.ts";

test("fitWithin scales the long side down and never up", () => {
  assert.deepEqual(fitWithin(5000, 2500, 2560), { width: 2560, height: 1280 });
  assert.deepEqual(fitWithin(1000, 4000, 2560), { width: 640, height: 2560 });
  assert.deepEqual(fitWithin(800, 600, 2560), { width: 800, height: 600 });
});
