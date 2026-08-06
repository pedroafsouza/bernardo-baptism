import { strict as assert } from "node:assert";
import { test } from "node:test";

import { formatNameList, guestGreetingList, splitGuestNames } from "../lib/names";

test("a household line is taken apart into the people in it", () => {
  assert.deepEqual(splitGuestNames("Marie and Kevin"), ["Marie", "Kevin"]);
  assert.deepEqual(splitGuestNames("Kitt og Jan"), ["Kitt", "Jan"]);
  assert.deepEqual(splitGuestNames("Sergio and Fernanda"), ["Sergio", "Fernanda"]);
  assert.deepEqual(splitGuestNames("Esdras & Vladia"), ["Esdras", "Vladia"]);
  assert.deepEqual(splitGuestNames("Carlos, Dinha, Sonia & Morges"), [
    "Carlos",
    "Dinha",
    "Sonia",
    "Morges",
  ]);
});

test("a name that is simply a name survives untouched", () => {
  assert.deepEqual(splitGuestNames("Helene"), ["Helene"]);
  assert.deepEqual(splitGuestNames("Eva (dk)"), ["Eva (dk)"]);
  assert.deepEqual(splitGuestNames("Fu Fei"), ["Fu Fei"]);
});

test("a missing name never becomes a greeting to nobody", () => {
  assert.deepEqual(splitGuestNames(""), []);
  assert.deepEqual(splitGuestNames(null), []);
  assert.deepEqual(splitGuestNames(undefined), []);
  assert.equal(formatNameList([], "en"), "");
});

test("Bernardo greets people the way a person would", () => {
  assert.equal(formatNameList(["Marie"], "en"), "Marie");
  assert.equal(formatNameList(["Marie", "Kevin"], "en"), "Marie and Kevin");
  assert.equal(
    formatNameList(["Carlos", "Dinha", "Sonia", "Morges"], "en"),
    "Carlos, Dinha, Sonia and Morges"
  );
  assert.equal(formatNameList(["Kitt", "Jan"], "da"), "Kitt og Jan");
  assert.equal(formatNameList(["Bibi", "Pedro"], "pt"), "Bibi e Pedro");
});

test("the greeting is built straight from the guest-list line", () => {
  assert.equal(guestGreetingList("Marco and Fu Fei", "en"), "Marco and Fu Fei");
  assert.equal(guestGreetingList("Steen og Jette", "da"), "Steen og Jette");
});
