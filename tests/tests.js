import { request } from "../lib/index.js";

describe("Effect tests api in pactum JS", () => {
  it("Tests simple get", async () => {
    await request("tests/json/01.json");
  });
  it("Tests simple get and validation", async () => {
    await request("tests/json/02.json");
  });
  it("Tests simple get and validation multiple", async () => {
    await request("tests/json/03.json");
  });
  it("Using expect", async () => {
    await request("tests/json/04.json");
  });
  it("Using expect", async () => {
    await request("tests/json/05.json");
  });

  it("Using env simple", async () => {
    await request("tests/json/06.json");
  });
  it("Using env simple url env part", async () => {
    await request("tests/json/07.json");
  });
  it("Using Schema", async () => {
    await request("tests/json/08.json");
  });
  it("Using payload", async () => {
    await request("tests/json/09.json");
  });
});
