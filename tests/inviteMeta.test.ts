import { test } from "node:test";
import assert from "node:assert/strict";

import { inviteMeta } from "../lib/inviteMeta";
import { LANGS } from "../lib/lang";

test("the card speaks the language the link carries", () => {
  assert.match(inviteMeta("da", null).title, /barnedåb/);
  assert.match(inviteMeta("en", null).title, /christening/);
  assert.match(inviteMeta("pt", null).title, /Batizado/);
});

test("the household is named in the title and greeted in the description", () => {
  const meta = inviteMeta("pt", "Heraldo & Rose");
  assert.ok(meta.title.startsWith("Heraldo & Rose — "));
  assert.ok(meta.description.startsWith("Heraldo & Rose, "));
});

test("a link without a guest still reads as an invitation", () => {
  for (const lang of LANGS) {
    const anonymous = inviteMeta(lang, null);
    assert.equal(anonymous.title, inviteMeta(lang, "   ").title);
    assert.ok(anonymous.description.length > 0);
    assert.ok(!anonymous.description.startsWith(","));
  }
});

test("every language declares its own locale and offers the others", () => {
  const locales = new Set<string>();
  for (const lang of LANGS) {
    const meta = inviteMeta(lang, null);
    locales.add(meta.locale);
    assert.equal(meta.alternateLocales.length, LANGS.length - 1);
    assert.ok(!meta.alternateLocales.includes(meta.locale));
  }
  assert.equal(locales.size, LANGS.length);
});
