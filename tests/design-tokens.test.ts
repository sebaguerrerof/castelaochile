import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
const componentsCss = readFileSync("src/styles/components.css", "utf8") + readFileSync("src/styles/blocks.css", "utf8");

/** Reads the first :root declaration of a custom property. */
function token(name: string): string {
  const match = tokensCss.match(new RegExp(`${name}:\s*([^;]+);`));
  assert.ok(match, `missing token ${name}`);
  return match[1].trim();
}

function hex(name: string): string {
  const value = token(name);
  const ref = value.match(/^var\((--[a-z-]+)\)$/);
  if (ref) return hex(ref[1]);
  assert.match(value, /^#[0-9a-f]{6}$/i, `${name} is not a hex colour`);
  return value;
}

function luminance(color: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("brand primitives match the identity manual", () => {
  assert.equal(token("--brand-blue"), "#0079be");
  assert.equal(token("--brand-orange"), "#da8a1b");
  assert.equal(token("--brand-gray"), "#868685");
});

test("text pairs meet WCAG AA (4.5:1) on the surfaces they are used on", () => {
  const surfaces = ["--background", "--surface", "--surface-muted", "--muted"];
  for (const surface of surfaces) {
    for (const text of ["--foreground", "--muted-foreground"]) {
      const ratio = contrast(hex(text), hex(surface));
      assert.ok(ratio >= 4.5, `${text} on ${surface} is ${ratio.toFixed(2)}:1`);
    }
  }
  // The manual's blue carries text only on white: on tinted surfaces it falls below AA.
  for (const surface of ["--background", "--surface"]) {
    assert.ok(contrast(hex("--brand-blue"), hex(surface)) >= 4.5, `brand blue on ${surface}`);
  }
  assert.ok(contrast(hex("--brand-blue"), hex("--surface-muted")) < 4.5, "rule: do not place blue text on --surface-muted");
  assert.ok(contrast(hex("--primary-foreground"), hex("--primary")) >= 4.5, "white on primary");
  assert.ok(contrast(hex("--accent-foreground"), hex("--accent")) >= 4.5, "text on accent");
});

test("the raw brand gray and orange are never allowed as body text", () => {
  assert.ok(contrast(hex("--brand-gray"), hex("--background")) < 4.5, "gray guard: if this passes, review the rule");
  assert.ok(contrast(hex("--brand-orange"), hex("--background")) < 3, "orange guard: decorative only");
});

test("display type never exceeds 6rem and the scale grows monotonically", () => {
  const maxRem = (name: string) => {
    const value = token(name);
    const clamp = value.match(/clamp\(\s*([\d.]+)rem,[^,]+,\s*([\d.]+)rem\)/);
    return clamp ? Number(clamp[2]) : Number(value.replace("rem", ""));
  };
  const scale = ["--text-xs", "--text-sm", "--text-base", "--text-md", "--text-lg", "--text-xl", "--text-2xl", "--text-3xl", "--text-display"];
  const sizes = scale.map(maxRem);
  assert.ok(Math.max(...sizes) <= 6, "display above 6rem");
  assert.deepEqual([...sizes].sort((a, b) => a - b), sizes, "type scale must be ordered");
});

test("body measure stays inside 65-75 characters", () => {
  const ch = Number(token("--measure").replace("ch", ""));
  assert.ok(ch >= 65 && ch <= 75);
});

test("component styles consume tokens only: no literal colours", () => {
  const literal = componentsCss.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g);
  assert.equal(literal, null, `literal colours found: ${literal}`);
});

test("components never declare a one-sided accent bar", () => {
  assert.doesNotMatch(componentsCss, /border-(left|right|top|bottom)\s*:\s*[^;]*(var\(--(primary|accent|brand))/);
});
