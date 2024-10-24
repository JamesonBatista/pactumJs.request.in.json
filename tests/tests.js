const { request } = require("../lib");
const pactum = require("pactum");

describe("Effect tests api in pactum JS", () => {
  it("Tests array tests", async () => {
    await request("./tests/json/get.json");
  });
});
