import assert from "node:assert/strict";
import test from "node:test";

import { buildSeoTitle } from "../src/lib/seo-title.ts";

const brand = "Instituto Castelao Chile";

test("a title that already ends with the brand does not repeat it", () => {
  assert.equal(buildSeoTitle("Quiénes Somos | Instituto Castelao Chile", brand), "Quiénes Somos | Instituto Castelao Chile");
  assert.equal(buildSeoTitle("Equipo Especializado en Adicciones | instituto castelao chile", brand), "Equipo Especializado en Adicciones | Instituto Castelao Chile");
});

test("the brand is added when the title does not have it and it fits", () => {
  assert.equal(buildSeoTitle("Noticias", brand), "Noticias | Instituto Castelao Chile");
});

test("a long title keeps only its own words so it is not cut by search engines", () => {
  const long = "Modelo Minnesota y Tratamiento de Adicciones | Castelao Chile";
  assert.equal(buildSeoTitle(long, brand), long);
  const post = "Vuelta a la rutina y consumo de alcohol: cómo identificar las señales de alerta";
  assert.equal(buildSeoTitle(post, brand), post);
});

test("a brand-only or empty title falls back to what was given", () => {
  assert.equal(buildSeoTitle("Instituto Castelao Chile", brand), "Instituto Castelao Chile");
});
