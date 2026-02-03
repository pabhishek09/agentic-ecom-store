# Agentic E-commerce Store - Copilot Instructions

## Project Overview
This is a TypeScript monorepo exploring agentic capabilities for a demo bookstore (local development focused). The architecture consists of two main applications that work together:
- **Store App** (`apps/store`): Express REST API with Prisma ORM + SQLite for product management
- **MCP Server** (`apps/mcp`): Model Context Protocol server that exposes store operations as tools for AI agents
- **Web App** (`apps/web`): NextJS web application which creates a mcp client to interact with the mcp server

## Architecture & Data Flow
The MCP server acts as a bridge between AI agents and the store backend:
1. MCP server exposes tools (e.g., `get_products`) defined in `apps/mcp/src/tools/`
2. Tools make HTTP requests to the store API (`http://localhost:3000/product/`)
3. Store API routes (`apps/store/src/api/`) use Prisma queries from `apps/store/prisma/queries/`
4. Prisma client is custom-generated to `apps/store/generated/prisma/` (see `schema.prisma`)

## Monorepo Structure
- **Workspace**: pnpm workspaces + Turborepo for task orchestration
- **Package Manager**: pnpm@10.0.0 (strict - see `packageManager` in root `package.json`)
- **Build System**: `turbo build` compiles all apps; MCP uses `pkgroll` for bundling
- Apps are ESM-only (`"type": "module"` in package.json)

## Key Developer Workflows

### Database Management (Store App)
The store uses Prisma with BetterSQLite3 adapter. Always work from `apps/store/`:
```bash
cd apps/store
pnpm run db:setup         # Full setup: migrate + generate + seed + studio
pnpm run migrate          # Create/apply migrations
pnpm run generate:client  # Generate Prisma client to generated/prisma/
pnpm run seed             # Seed from prisma/seed/data/*.json
pnpm run db:vis           # Open Prisma Studio
```
**Critical**: After schema changes, always run `generate:client` before restarting the server.

### Running the Applications
Both apps must run concurrently for MCP to function:
```bash

pnpm run dev # from the monorepo root
```
Or manually in separate terminals:
```bash
# Terminal 1 - Store API (port 3000)
cd apps/store && pnpm run dev

# Terminal 2 - MCP Server (port 4000)
cd apps/mcp && pnpm run dev
```

### Testing MCP Tools
Use the MCP Inspector to test tools before integrating with agents:
```bash
cd apps/mcp
pnpm run build
npx @modelcontextprotocol/inspector node dist/server.mjs
```

## Code Conventions

### Prisma Patterns
- **Custom output path**: Prisma client generates to `apps/store/generated/prisma/` (not `node_modules`)
- **Import pattern**: Always import from the generated path:
  ```typescript
  import { PrismaClient } from "../generated/prisma/client.js";
  ```
- **Adapter usage**: SQLite requires BetterSQLite3 adapter initialization (see `apps/store/lib/prisma.ts`)
- **Config file**: Uses `prisma.config.ts` for environment-based datasource URL

### MCP Tool Registration
Tools follow a consistent pattern in `apps/mcp/src/tools/`:
1. Export an async function returning `CallToolResult`
2. Export a `toolDefinition` object with `title` and `description`
3. Register in `server.ts` with `server.registerTool(name, definition, handler)`

Example structure:
```typescript
export async function getProducts(): Promise<CallToolResult> {
  const response = await fetch(PRODUCT_API_URL);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

export const getProductsToolDefinition = {
  title: 'Get Products',
  description: 'Fetch all products from the e-commerce store'
};
```

### API Route Patterns
Store API routes in `apps/store/src/api/` follow Express Router conventions:
- Import Prisma queries from `prisma/queries/`
- Use try/catch with standardized error responses: `res.status(500).json({ error: 'message' })`
- Mount routers in `src/index.ts` with path prefixes

### Session Management (MCP)
The MCP server maintains stateful connections via `StreamableHTTPServerTransport`:
- Session IDs are generated per client and stored in `transports` map
- `InMemoryEventStore` enables session resumability
- Cleanup happens via `transport.onclose` handlers

**Authentication (To Be Implemented)**:
- MCP server currently lacks authentication - all requests are accepted
- Future implementation needs:
  - Request authentication before accepting `initialize` requests
  - Session-based auth token validation for subsequent requests
  - Consider OAuth2 or API key mechanisms
  - AUTH_PORT configuration (referenced in commented code at line 86 of `server.ts`)
  - Secure session ID validation to prevent session hijacking

## Environment Configuration
- Store requires `DATABASE_URL` in `apps/store/.env` (e.g., `file:./dev.db`)
- MCP uses `MCP_PORT` (defaults to 4000)
- Both apps use `dotenv/config` - ensure `.env` files exist before running

## Common Pitfalls
- **Prisma client not found**: Run `pnpm run generate:client` in `apps/store`
- **MCP tools fail**: Verify store API is running on port 3000
- **Build errors**: Ensure pnpm version matches `packageManager` field (10.0.0)
- **Import errors**: Remember `.js` extensions in ESM imports (TypeScript doesn't add them)
