// node --test test.mjs — runs the bridge against a local mock of the WhichTrim endpoint. No network.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function mock() {
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ headers: req.headers, body });
      const m = JSON.parse(body);
      const one = (x) => (x.id === undefined ? null : { jsonrpc: "2.0", id: x.id, result: { echo: x.method } });
      const out = Array.isArray(m) ? m.map(one).filter(Boolean) : one(m);
      if (!out || (Array.isArray(out) && !out.length)) { res.writeHead(202); return res.end(); }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(out, null, 2));          // pretty-printed on purpose: the bridge must re-emit one line
    });
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ srv, seen, url: `http://127.0.0.1:${srv.address().port}/portal/mcp` })));
}

function run(url, lines) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(HERE, "index.js")], { env: { ...process.env, WHICHTRIM_MCP_URL: url } });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => resolve(out.split("\n").filter(Boolean).map((l) => JSON.parse(l))));
    for (const l of lines) p.stdin.write(l + "\n");
    p.stdin.end();
  });
}

test("initialize, a notification and a call: replies for requests only, one line each", async () => {
  const { srv, seen, url } = await mock();
  const out = await run(url, [
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  ]);
  srv.close();
  assert.deepEqual(out.map((o) => o.id).sort(), [1, 2]);
  assert.equal(seen.length, 3, "every message is forwarded, notifications included");
  assert.equal(seen[2].headers["mcp-protocol-version"], "2025-03-26", "the negotiated protocol version is sent on later calls");
  assert.match(seen[0].headers["user-agent"], /^whichtrim-mcp-stdio\//);
});

test("a batch comes back as one line; garbage gets a parse error", async () => {
  const { srv, url } = await mock();
  const out = await run(url, [
    JSON.stringify([{ jsonrpc: "2.0", id: 7, method: "tools/list" }, { jsonrpc: "2.0", id: 8, method: "ping" }]),
    "{not json",
  ]);
  srv.close();
  const batch = out.find(Array.isArray);
  assert.deepEqual(batch.map((o) => o.id), [7, 8]);
  assert.ok(out.find((o) => o.error && o.error.code === -32700));
});

test("an unreachable endpoint answers the request with an error instead of hanging", async () => {
  const out = await run("http://127.0.0.1:9/portal/mcp", [JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" })]);
  assert.equal(out[0].id, 3);
  assert.equal(out[0].error.code, -32603);
});
