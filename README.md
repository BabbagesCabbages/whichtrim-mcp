# whichtrim-mcp

An MCP server for U.S. vehicle records. Ask your assistant about a car and it gets the federal record, not a guess:

- NHTSA recalls, with park-outside and do-not-drive advisories and completion rates
- owner complaints, and the mileage at which owners reported problems
- open defect investigations
- manufacturer service bulletins, campaigns and warranty extensions, looked up by the number on the letter
- diagnostic trouble codes, and which vehicles' records actually name them
- EPA fuel economy, NCAP crash ratings, VIN decoding and trim-level prices where a press kit is on file

It covers every model year from 2016 on, plus recall campaigns going back further. The data is public: it comes from NHTSA, EPA and manufacturer press kits. It is republished at [whichtrim.com](https://whichtrim.com) and is free to use, with no key and no sign-up.

## Two ways to connect

**Remote (recommended).** If your client supports remote MCP servers, point it at the URL. Nothing needs to be installed.

```
https://whichtrim.com/portal/mcp
```

**Local (stdio).** Some clients only launch local servers. For those, this package is a small bridge that has no dependencies: it forwards each JSON-RPC message to the URL above and passes the reply back. It requires Node 18 or later.

```
npx -y github:BabbagesCabbages/whichtrim-mcp
```

## Client setup

**Claude Desktop** (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "whichtrim": { "command": "npx", "args": ["-y", "github:BabbagesCabbages/whichtrim-mcp"] }
  }
}
```

In Claude.ai or Claude Desktop you can instead add a custom connector: Settings → Connectors → Add custom connector, then paste the URL.

**Claude Code**

```
claude mcp add --transport http whichtrim https://whichtrim.com/portal/mcp
```

**Cursor** (`~/.cursor/mcp.json`)

```json
{ "mcpServers": { "whichtrim": { "url": "https://whichtrim.com/portal/mcp" } } }
```

**VS Code** (`.vscode/mcp.json`)

```json
{ "servers": { "whichtrim": { "type": "http", "url": "https://whichtrim.com/portal/mcp" } } }
```

**Windsurf, Cline, Goose, Zed and other stdio-only clients:** use the command `npx` with the arguments `-y github:BabbagesCabbages/whichtrim-mcp`.

## Tools

| Tool | What it answers |
|---|---|
| `search_vehicles` | Find model years by make, model and/or year. Returns the vehicle id the other tools take, plus each match's grade and recall count. |
| `get_vehicle` | The full record for one model year: fuel economy, recalls, complaint counts and failure mileage, crash ratings, investigations, bulletins and trouble codes. |
| `check_recalls` | Every recall campaign for one model year, with advisories and completion rates. It says plainly that a recall applies to a build range, so only a VIN check can confirm that one specific car is affected. |
| `decode_vin` | Decodes a 17-character VIN against NHTSA's vPIC database and joins it to the record for that model year. |
| `lookup_trouble_code` | What a code such as P0420 means, and which model years' bulletins and complaints name it. |
| `lookup_bulletin` | A service bulletin or campaign by its printed number (e.g. `26-01-068H`, `9D6`, `N262570770`), with links to NHTSA's PDF where one exists. |
| `compare_vehicles` | Two model years side by side: economy or range, grade, recalls, complaints, crash rating and starting price. |

All seven tools are read-only.

## Try it

- "Has the 2021 Kia Telluride had any do-not-drive recalls?"
- "What is GM bulletin N262570770 about, and which trucks does it cover?"
- "Which cars' owners complain about P0420, and at what mileage?"
- "Decode this VIN and tell me what's open on that model year: <paste a VIN>"
- "Compare a 2024 RAV4 Hybrid with a 2024 CR-V Hybrid on reliability and running costs."

## Privacy

The bridge stores nothing and sends no telemetry. Each request goes only to whichtrim.com, which logs the tool name and response time and not your conversation. See the [privacy page](https://whichtrim.com/privacy/).

## Also

- REST API, bulk data and the OpenAPI description: <https://whichtrim.com/developers/>
- Official MCP Registry entry: `com.whichtrim/vehicle-records`
- The datasets are CC BY 4.0 on Zenodo, Kaggle and Hugging Face. Links are at <https://whichtrim.com/coverage/>.

MIT licensed. The data comes from U.S. federal agencies and manufacturers and is not legal or mechanical advice. For a specific vehicle, check its VIN at nhtsa.gov/recalls.
