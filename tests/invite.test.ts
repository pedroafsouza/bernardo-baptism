import { test } from "node:test";
import assert from "node:assert/strict";

import { buildInviteMessage, inviteSignature, MESSAGE_LANGS } from "../lib/invite";

test("the parents sign with the family name once, in the guest's language", () => {
  // Unconfigured, so the fictional parents: the real ones live in the
  // environment and are never in the repository.
  assert.equal(inviteSignature("da"), "Anna og Jonas Eksempel");
  assert.equal(inviteSignature("en"), "Anna and Jonas Eksempel");
  assert.equal(inviteSignature("pt"), "Anna e Jonas Eksempel");
});

test("every invitation is signed, and never with an ampersand", () => {
  for (const { id } of MESSAGE_LANGS) {
    for (const channel of ["whatsapp", "email"] as const) {
      const { body } = buildInviteMessage({
        name: "Kitt og Jan",
        link: "https://freitasdesouza.dk/?code=KITJAN",
        lang: id,
        channel,
      });
      assert.ok(body.trimEnd().endsWith(inviteSignature(id)), `${id}/${channel} is unsigned`);
      assert.ok(!body.includes(" & "), `${id}/${channel} still signs with an ampersand`);
    }
  }
});

test("the personal link stands on its own line so it is clickable", () => {
  const { body } = buildInviteMessage({
    name: "Bibi and Pedro",
    link: "https://freitasdesouza.dk/?code=BIBEDRO",
    lang: "en",
    channel: "whatsapp",
  });
  assert.ok(body.includes("\nhttps://freitasdesouza.dk/?code=BIBEDRO\n"));
});
