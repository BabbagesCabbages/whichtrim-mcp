#!/usr/bin/env node
/**
 * whichtrim-mcp — a stdio bridge to the WhichTrim vehicle-records MCP server.
 *
 * WhichTrim runs a public, keyless MCP server over Streamable HTTP at https://whichtrim.com/portal/mcp. Clients that
 * speak remote MCP can use that URL directly. This package is for the ones that only launch local (stdio) servers:
 * it reads newline-delimited JSON-RPC from stdin, POSTs each message to the endpoint, and writes each reply to stdout.
 *
 * No dependencies, no state, no telemetry. Nothing is written to disk. Requires Node 18+ (global fetch).
 *   WHICHTRIM_MCP_URL   override the endpoint (testing)
 */
import { createInterface } from "node:readline";

const ENDPOINT = process.env.WHICHTRIM_MCP_URL || "https://whichtrim.com/portal/mcp";
const UA = "whichtrim-mcp-stdio/1.0.0 (+https://whichtrim.com/developers/#mcp)";
const TIMEOUT_MS = 30000;

let protocolVersion = "2025-06-18";
let pending = 0;
let closing = false;

const write = (obj) => process.stdout.write(JSON.stringify(obj) + "\n");
const log = (msg) => process.stderr.write(`[whichtrim-mcp] ${msg}\n`);

function errorFor(msg, code, message) {
  // Requests (with an id) get a JSON-RPC error back; notifications get nothing, as the spec requires.
  const ids = (Array.isArray(msg) ? msg : [msg]).filter((m) => m && m.id !== undefined && m.id !== null);
  for (const m of ids) write({ jsonrpc: "2.0", id: m.id, error: { code, message } });
}

async function forward(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  const first = Array.isArray(msg) ? msg[0] : msg;
  if (first && first.method === "initialize" && first.params && first.params.protocolVersion) {
    protocolVersion = String(first.params.protocolVersion);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": protocolVersion,
        "user-agent": UA,
      },
      body: line,
      signal: ctrl.signal,
    });
    if (r.status === 202 || r.status === 204) return;          // notifications: nothing to relay
    const text = await r.text();
    if (!r.ok && !text) { errorFor(msg, -32603, `WhichTrim returned HTTP ${r.status}`); return; }
    const type = r.headers.get("content-type") || "";
    if (type.includes("text/event-stream")) {
      // Not used by the server today, but relay SSE data lines faithfully if it ever streams.
      for (const l of text.split(/\r?\n/)) if (l.startsWith("data:")) { const d = l.slice(5).trim(); if (d) process.stdout.write(d + "\n"); }
      return;
    }
    // A single reply or a batch array: either way one JSON value per line, re-serialised to guarantee no newlines.
    write(JSON.parse(text));
  } catch (e) {
    errorFor(msg, -32603, e && e.name === "AbortError" ? "WhichTrim did not answer in time" : `Could not reach WhichTrim: ${e && e.message ? e.message : e}`);
  } finally {
    clearTimeout(timer);
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (!line.trim()) return;
  pending++;
  forward(line).finally(() => { pending--; if (closing && pending === 0) process.exit(0); });
});
rl.on("close", () => { closing = true; if (pending === 0) process.exit(0); });
process.on("SIGINT", () => process.exit(0));
log(`bridging stdio to ${ENDPOINT}`);
