# Runs the stdio bridge in a container, for registries that build and introspect MCP servers (Glama and others).
# No dependencies to install. The bridge forwards JSON-RPC on stdin to https://whichtrim.com/portal/mcp.
FROM node:20-alpine
WORKDIR /app
COPY package.json index.js ./
ENTRYPOINT ["node", "index.js"]
