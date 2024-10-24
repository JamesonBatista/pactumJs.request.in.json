const pactum = require("pactum");
const Joi = require("joi");

let dataSave = undefined;
async function request(object, schema) {
  if (!dataSave) dataSave = {};

  const json = require(`../${object}`);
  if (Array.isArray(json)) for (let object_request of json) req(object_request);
  else req(json);
}

async function req(json, schema) {
  var r = pactum.spec();

  const methodKeys = ["get", "post", "delete", "patch", "put"];
  let url = json[methodKeys.find((key) => key in json) || "get"];

  // replace {}
  if (url.includes("{") && url.includes("}")) url = await rurl(url, dataSave);

  //create function url not initial https

  const methodMap = {
    post: "POST",
    put: "PUT",
    delete: "DELETE",
    get: "GET",
    patch: "PATCH",
  };

  Object.keys(methodMap).forEach((key) => {
    if (json[key] && typeof json[key] === "string") {
      const method = methodMap[key];

      if ((h = json.headers || json.header)) {
        r.withHeaders(h);
      }
      // req method
      r.withMethod(method).withPath(url);
      // status
      if (method === "GET" && !json.status) r.expectStatus(200);
      else if (method === "POST" && !json.status) r.expectStatus(201);

      // query
      if (json.query) r.withQueryParams(json.query);
      if (json.cookies) r.withCookies(json.cookies);
      if (json.auth) r.withAuth(json.auth);
      if (json.token) r.withBearerToken(json.token);
    }
  });

  if ((p = json.json || json.payload)) r.withJson(p);
  if (json.body) r.withBody(json.body);
  if (json.form) r.withForm(json.form);
  if (Array.isArray(json.inspect))
    for (let inspect_path of json.inspect) r.inspect(inspect_path);
  else if (json.inspect) r.inspect(json.inspect);

  if (json.retry) r.retry(json.retry);

  if (json.schema) r.expectJsonSchema(json.schema);

  await r.stores("response", "body").toss();

  console.log("Body armazenado:", pactum.handler.stores.get("response"));
}
async function rurl(url, data) {
  return url.replace(/{([^}]+)}/g, (match, key) => {
    // Verifica se a chave (key) existe em dataSave
    if (data[key]) {
      return data[key]; // Substitui o placeholder com o valor de dataSave
    } else {
      throw new Error(`Valor para '${key}' não encontrado em dataSave`);
    }
  });
}

module.exports = {
  request,
};
