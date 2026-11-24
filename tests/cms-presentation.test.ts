import assert from "node:assert/strict";
import test from "node:test";

import { showsCardIndex, visibleEyebrow } from "../src/lib/cms/presentation.ts";

const brand = "Instituto Castelao Chile";

test("a hero label that repeats the brand name is hidden", () => {
  assert.equal(visibleEyebrow("Instituto Castelao Chile", brand), null);
  assert.equal(visibleEyebrow("  INSTITUTO  CASTELAO CHILE ", brand), null);
  assert.equal(visibleEyebrow("Instituto Castelao Chile", "instituto castelao chile"), null);
});

test("a hero label with real information stays visible", () => {
  assert.equal(visibleEyebrow("PROYECTO EN DESARROLLO", brand), "PROYECTO EN DESARROLLO");
  assert.equal(visibleEyebrow("Proyecto en desarrollo", brand), "Proyecto en desarrollo");
});

test("an empty or missing label is hidden", () => {
  assert.equal(visibleEyebrow(undefined, brand), null);
  assert.equal(visibleEyebrow("   ", brand), null);
});

test("accents do not change the comparison", () => {
  assert.equal(visibleEyebrow("Instituto Castelao Chilé", "Instituto Castelao Chile"), null);
});

test("card numbering is shown only for steps", () => {
  assert.equal(showsCardIndex("steps"), true);
  assert.equal(showsCardIndex("principles"), false);
  assert.equal(showsCardIndex("feature_cards"), false);
});

import { textVariants } from "../src/lib/cms/presentation.ts";

const block = (id: string, section_type: string, showTitle = true) => ({ id, section_type, data: { showTitle } });

test("the untitled text after the hero is the introduction", () => {
  const variants = textVariants([block("h", "hero"), block("a", "rich_text", false), block("c", "feature_cards")]);
  assert.equal(variants.get("a"), "lead");
});

test("a status notice between the hero and the text does not take the introduction away", () => {
  const variants = textVariants([block("h", "hero"), block("w", "warning"), block("a", "rich_text", false)]);
  assert.equal(variants.get("a"), "lead");
});

test("titled texts alternate so consecutive blocks differ", () => {
  const variants = textVariants([block("h", "hero"), block("a", "rich_text"), block("b", "rich_text"), block("c", "rich_text")]);
  assert.deepEqual([variants.get("a"), variants.get("b"), variants.get("c")], ["split", "panel", "split"]);
});

test("an untitled text later in the page is not an introduction", () => {
  const variants = textVariants([block("h", "hero"), block("k", "feature_cards"), block("a", "rich_text", false)]);
  assert.equal(variants.get("a"), "split");
});

test("an untitled text right after the introduction is a closing statement", () => {
  const variants = textVariants([block("h", "hero"), block("a", "rich_text", false), block("b", "rich_text", false), block("c", "rich_text")]);
  assert.deepEqual([variants.get("a"), variants.get("b"), variants.get("c")], ["lead", "statement", "split"]);
});
