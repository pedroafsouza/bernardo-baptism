import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  countGuestNames,
  formatNameList,
  guestGreetingList,
  splitGuestNames,
} from "../lib/names";

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

test("the joining word is read whatever case it is written in", () => {
  assert.deepEqual(splitGuestNames("Bibi AND Pedro"), ["Bibi", "Pedro"]);
  assert.deepEqual(splitGuestNames("Kitt OG Jan"), ["Kitt", "Jan"]);
  assert.deepEqual(splitGuestNames("Bibi E Pedro"), ["Bibi", "Pedro"]);
  assert.deepEqual(splitGuestNames("Kitt og så Jan"), ["Kitt", "Jan"]);
  assert.deepEqual(splitGuestNames("Bibi + Pedro"), ["Bibi", "Pedro"]);
});

test("a joining word inside a name is not a joining word", () => {
  assert.deepEqual(splitGuestNames("Anders Ogilvy"), ["Anders Ogilvy"]);
  assert.deepEqual(splitGuestNames("Alexander Andersen"), ["Alexander Andersen"]);
  assert.deepEqual(splitGuestNames("Ana Luisa"), ["Ana Luisa"]);
});

test("a household line says how many people are on it", () => {
  assert.equal(countGuestNames("Bibi and Pedro"), 2);
  assert.equal(countGuestNames("Kitt og Jan"), 2);
  assert.equal(countGuestNames("Esdras, Vladia e Cecilia"), 3);
  assert.equal(countGuestNames("Helene"), 1);
  assert.equal(countGuestNames("Ana Luisa"), 1);
});

test("an invitation always has somebody to answer for it", () => {
  assert.equal(countGuestNames(""), 1);
  assert.equal(countGuestNames(null), 1);
  assert.equal(countGuestNames(undefined), 1);
});
