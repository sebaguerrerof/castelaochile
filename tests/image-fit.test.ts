import assert from "node:assert/strict";
import test from "node:test";

import { fitWithin } from "../src/lib/image-fit.ts";

test("a large landscape photo is scaled down on its longest side", () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 2000, height: 1500 });
});

test("a portrait photo is limited by its height", () => {
  assert.deepEqual(fitWithin(3000, 4000), { width: 1500, height: 2000 });
});

test("an image already within the limit is left alone", () => {
  assert.deepEqual(fitWithin(1086, 1448), { width: 1086, height: 1448 });
  assert.deepEqual(fitWithin(2000, 1000), { width: 2000, height: 1000 });
});
