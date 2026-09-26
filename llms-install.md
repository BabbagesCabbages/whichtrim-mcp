# Installing whichtrim-mcp (for AI agents)

WhichTrim is a hosted, read-only MCP server for U.S. vehicle records: NHTSA recalls, complaints, investigations, service bulletins, trouble codes, VIN decoding, EPA fuel economy and crash ratings. You don't need an API key, an account or environment variables, and there is nothing to clone or build.

## Pick one of these two setups

### A. Local stdio (works in every client, including Cline)

You need Node.js 18 or later. Add this entry to the client's MCP settings. In Cline, that file is `cline_mcp_settings.json`.

```json
{
  "mcpServers": {
    "whichtrim": {
      "command": "npx",
      "args": ["-y", "github:BabbagesCabbages/whichtrim-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

`npx` fetches this repository and runs `index.js`. That file is a small bridge with no dependencies. It forwards each JSON-RPC message to `https://whichtrim.com/portal/mcp` and relays the reply.

### B. Remote (clients that support Streamable HTTP)

Point the client at this URL, with no headers and no auth:

```
https://whichtrim.com/portal/mcp
```

## Check that it works

1. The server should list **7 tools**: `search_vehicles`, `get_vehicle`, `check_recalls`, `decode_vin`, `lookup_trouble_code`, `lookup_bulletin`, `compare_vehicles`.
2. Call `search_vehicles` with `{"query": "kia telluride", "year": 2021}`. The result should include the vehicle id `2021_kia_telluride`.
3. Call `check_recalls` with `{"id": "2021_kia_telluride"}`. It returns that model year's recall campaigns.

If `npx` is missing, install Node.js 18+ and restart the client. If the network blocks `whichtrim.com`, neither setup will work.

## Notes

- Every tool is read-only, so it is safe to auto-approve.
- A recall applies to a build range, not a whole model year. Only a VIN check at nhtsa.gov/recalls confirms that one specific vehicle is affected. The tools say this in their output.
- Docs: https://whichtrim.com/developers/#mcp
