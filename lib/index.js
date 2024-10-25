import pactum from "pactum";
import fs from "fs";
import { expect } from "chai";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import FakerUse from "./faker.js";
import { faker, simpleFaker } from "@faker-js/faker";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dataSave = undefined;
export async function request(object, schema) {
  let json;
  if (!dataSave) dataSave = {};
  if (typeof object === "string") {
    const _ = path.join(__dirname, `../${object}`);
    json = fs.readFileSync(_, "utf8");
    json = JSON.parse(json);
  } else {
    json = object;
  }

  if (Array.isArray(json))
    for (let request_object of json) await req(request_object);
  else await req(json);
}

async function req(json, schema) {
  json = await replaceAllStrings(json);

  var r = pactum.spec();

  const methodKeys = ["get", "post", "delete", "patch", "put"];
  let url = json[methodKeys.find((key) => key in json) || "get"];

  // env.json
  url = await envHandle(url);

  // replace {}
  if (url.includes("{") && url.includes("}")) url = await rurl(url, dataSave);

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

      if (method === "GET") {
        r.expectStatus(200);
      } else {
        r.expectStatus(json.status);
      }

      if (method === "POST") {
        if (json.status) {
          r.expectStatus(json.status);
        } else r.expectStatus(201);
      }
      // req method
      r.withMethod(method).withPath(url);
    }
  });

  if (json.headers || json.header) {
    r.withHeaders(json.headers || json.header);
  }

  if (json.query) r.withQueryParams(json.query);
  if (json.cookies) r.withCookies(json.cookies);
  if (json.auth) r.withAuth(json.auth);
  if (json.token) r.withBearerToken(json.token);
  if (json.json || json.payload) r.withJson(json.json || json.payload);
  if (json.body) r.withBody(json.body);
  if (json.form) r.withForm(json.form);

  if (Array.isArray(json.inspect))
    for (let inspect_path of json.inspect) r.inspect(inspect_path);
  else if (json.inspect) r.inspect(json.inspect);

  if (json.retry) r.retry(json.retry);

  if (json.schema) r.expectJsonSchema(json.schema);

  r.expect((response) => {
    if (json.log) {
      console.log("\x1b[34m%s\x1b[0m", "\nRequest:");
      console.log(
        "\x1b[44m%s\x1b[0m",
        JSON.stringify(response.req, null, 2) + "\n"
      );
      console.log("\x1b[36m%s\x1b[0m", "Response");
      console.log(
        "\x1b[46m%s\x1b[0m",
        JSON.stringify(response.res.body, null, 2) + "\n"
      );
    }
    // expect

    if (json.expect) {
      if (Array.isArray(json.expect))
        for (let a of json.expect) as(a, response.res.body);
      else as(json.expect, response.res.body);
    }
    // save
    if (json.save && typeof json.save === "string")
      saveReq(response.res.body, json.save);
    else if (json.save) {
      if (Array.isArray(json.save))
        for (let save_ of json.save) saveReq(response.res.body, save_);
      else saveReq(response.res.body, json.save);
    }
  });

  try {
    await r.toss();
  } catch (error) {
    console.error("Request error:", error);
  }
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

function findInJson(obj, keyToFind) {
  let results = [];

  function traverse(currentObj) {
    if (Array.isArray(currentObj)) {
      for (let item of currentObj) {
        traverse(item);
      }
    } else if (currentObj !== null && typeof currentObj === "object") {
      for (let key in currentObj) {
        if (currentObj.hasOwnProperty(key)) {
          if (key === keyToFind) {
            results.push(currentObj[key]);
          } else if (typeof currentObj[key] === "object") {
            traverse(currentObj[key]);
          }
        }
      }
    }
  }

  traverse(obj);
  results = [...new Set(results)];
  if (results.length === 0) {
    return undefined;
  } else {
    return results;
  }
}
function saveReq(body, path) {
  if (typeof path === "string") {
    var value = findInJson(body, path);
    value = value && value.length > 1 ? value : value[0];
    if (value) {
      expect(value).to.exist;
      dataSave[path] = value;
      logColors("orange", `${value} in [${path}]`);
    }
  } else {
    var value = findInJson(body, path.path);
    value = value && value.length > 1 ? value : value[0];
    dataSave[path.path] = value;
    logColors("orange", `${value} in [${path.path}]`);
  }
}
function logColors(color, msg) {
  if (color === "green")
    console.log("\x1b[1m\x1b[37m\x1b[42m%s\x1b[0m", `\nㅤassert - ${msg} \n`);
  if (color === "orange")
    console.log("\x1b[1m\x1b[37m\x1b[43m%s\x1b[0m", `\nㅤsave - ${msg}\n`);
}

function replaceAllStrings(obj) {
  function applySubstitutions(currentObj) {
    // Verifica se é um array
    if (Array.isArray(currentObj)) {
      return currentObj.map((item) => applySubstitutions(item));
    }
    // Verifica se é um objeto
    else if (typeof currentObj === "object" && currentObj !== null) {
      const newObj = {}; // Cria um novo objeto para armazenar os valores substituídos

      // Itera sobre as chaves do objeto
      Object.entries(currentObj).forEach(([key, value]) => {
        if (typeof value === "string") {
          const fakers = new FakerUse(); // Instância do faker

          // Verifica se o valor começa com "faker."
          if (value.startsWith("faker.")) {
            const suffix = value.split("faker.")[1];
            // Substitui com o valor correspondente de acordo com o sufixo
            switch (suffix) {
              case "name":
              case "nome":
                newObj[key] = fakers.name();
                break;
              case "email":
                newObj[key] = fakers.emails();
                break;
              case "enterpriseName":
              case "empresaNome":
              case "enterprise":
                newObj[key] = fakers.enterprise();
                break;
              case "state":
              case "estado":
                newObj[key] = fakers.state();
                break;
              case "city":
              case "cidade":
                newObj[key] = fakers.city();
                break;
              case "country":
              case "pais":
                newObj[key] = fakers.country();
                break;
              case "street":
              case "address":
              case "rua":
                newObj[key] = fakers.street();
                break;
              case "phoneNumber":
              case "numeroTelefone":
              case "phone":
                newObj[key] = fakers.phoneNumber();
                break;
              case "cep":
                newObj[key] = fakers.cep();
                break;
              case "cpf":
                newObj[key] = fakers.cpf();
                break;
              case "cnpj":
                newObj[key] = fakers.cnpj();
                break;
              case "password":
              case "senha":
                newObj[key] = fakers.password();
                break;
              case "uuid":
                newObj[key] = fakers.uuid();
                break;
              case "birthdate":
              case "aniversario":
                newObj[key] = fakers.birthdate();
                break;
              case "avatar":
                newObj[key] = fakers.avatar();
                break;
              case "professional":
              case "profissao":
                newObj[key] = fakers.professional();
                break;
              case "product":
              case "produto":
                newObj[key] = fakers.products();
                break;
              case "image":
              case "imagem":
                newObj[key] = fakers.image();
                break;
              case "text":
              case "texto":
                newObj[key] = fakers.text();
                break;
              case "title":
              case "titulo":
                newObj[key] = fakers.title();
                break;
              case "actualDate":
              case "dataAtual":
                newObj[key] = fakers.actualDate();
                break;
              case "futureDate":
              case "dataFutura":
                newObj[key] = fakers.futureDate();
                break;
              case "frutas":
                newObj[key] = fakers.frutasBR();
                break;
              case "fruit":
                newObj[key] = fakers.frutasEN();
                break;
              case "objeto":
                newObj[key] = fakers.objetoBR();
                break;
              case "object":
                newObj[key] = fakers.objetoEN();
                break;
              default:
                if (suffix.includes("number")) {
                  const splitNum = suffix.split("number");
                  newObj[key] = fakers.genNum(splitNum[1]);
                } else {
                  newObj[key] = value; // Mantém o valor se o sufixo não for encontrado
                }
                break;
            }
          }
          // Substituição de chaves no formato `{key}`
          else {
            newObj[key] = value.replace(/\{(\w+)\}/g, (match, p1) => {
              return dataSave.hasOwnProperty(p1)
                ? dataSave[p1]
                : `not found ${p1}`;
            });
          }
        }
        // Aplica substituições recursivamente em objetos e arrays
        else {
          newObj[key] = applySubstitutions(value);
        }
      });
      return newObj;
    }
    // Retorna diretamente se não for um objeto ou array
    else {
      return currentObj;
    }
  }

  return applySubstitutions(obj);
}

async function envHandle(url) {
  const _ = path.join(__dirname, `../env.json`);
  let json = fs.readFileSync(_, "utf8");
  json = JSON.parse(json);
  let ur;
  if (url.includes("/") && !url.startsWith("http")) {
    const splitUrl = url.split("/");
    for (let u of splitUrl) {
      const s = json[u];
      if (s && ur) ur += `${s}/`;
      else if (s && !ur) ur = `${s}/`;
      else if (ur && !s) ur += `${u}/`;
    }
    if (ur.endsWith("/")) ur = ur.slice(0, -1);
  } else if (!url.startsWith("http")) {
    const uc = json[url];
    if (uc) ur = uc;
    else throw `Endpoint ${url} not found in env.json`;
  }

  return ur ? ur : url;
}

function as(_expect, body) {
  const _path = _expect.path ? _expect.path : _expect;

  let v = findInJson(body, _path);

  v = v.length > 1 ? v : v[0];
  if (v && !_expect.eq) logColors("green", `${v} exist inpath ${_path}`);

  if (v && _expect.eq) {
    if (v === _expect.eq) logColors("green", `${v} Equal  ${_expect.eq}`);
    else throw `${v} not Equal ${_expect.eq}`;
  }
}
