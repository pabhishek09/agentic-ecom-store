import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

class InMemoryEventStore {
  events = /* @__PURE__ */ new Map();
  /**
   * Generates a unique event ID for a given stream ID
   */
  generateEventId(streamId) {
    return `${streamId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  /**
   * Extracts the stream ID from an event ID
   */
  getStreamIdFromEventId(eventId) {
    const parts = eventId.split("_");
    return parts.length > 0 ? parts[0] : "";
  }
  /**
   * Stores an event with a generated event ID
   * Implements EventStore.storeEvent
   */
  async storeEvent(streamId, message) {
    const eventId = this.generateEventId(streamId);
    this.events.set(eventId, { streamId, message });
    return eventId;
  }
  /**
   * Replays events that occurred after a specific event ID
   * Implements EventStore.replayEventsAfter
   */
  async replayEventsAfter(lastEventId, { send }) {
    if (!lastEventId || !this.events.has(lastEventId)) {
      return "";
    }
    const streamId = this.getStreamIdFromEventId(lastEventId);
    if (!streamId) {
      return "";
    }
    let foundLastEvent = false;
    const sortedEvents = [...this.events.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));
    for (const [eventId, { streamId: eventStreamId, message }] of sortedEvents) {
      if (eventStreamId !== streamId) {
        continue;
      }
      if (eventId === lastEventId) {
        foundLastEvent = true;
        continue;
      }
      if (foundLastEvent) {
        await send(eventId, message);
      }
    }
    return streamId;
  }
}

const getServer = async () => {
  const server2 = new McpServer({
    name: "Store MCP server",
    version: "1.0.0"
  }, {
    // TBD - Create InMemoryTaskStore
    // capabilities: { logging: {}, tasks: { requests: { tools: { call: {} } } } },
    // taskStore, // Enable task support
    // taskMessageQueue: new InMemoryTaskMessageQueue()
  });
  server2.registerTool(
    "greet",
    {
      title: "Greeting Tool",
      // Display name for UI
      description: "A simple greeting tool",
      inputSchema: {
        name: z.string().describe("Name to greet")
      }
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: `Hello, ${name}!`
          }
        ]
      };
    }
  );
  server2.registerPrompt(
    "greeting-template",
    {
      title: "Greeting Template",
      // Display name for UI
      description: "A simple greeting prompt template",
      argsSchema: {
        name: z.string().describe("Name to include in greeting")
      }
    },
    async ({ name }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please greet ${name} in a friendly manner.`
            }
          }
        ]
      };
    }
  );
  server2.registerResource(
    "greeting-resource",
    "https://example.com/greetings/default",
    {
      title: "Default Greeting",
      // Display name for UI
      description: "A simple greeting resource",
      mimeType: "text/plain"
    },
    async () => {
      return {
        contents: [
          {
            uri: "https://example.com/greetings/default",
            text: "Hello, world!"
          }
        ]
      };
    }
  );
  return server2;
};
const transports = {};
const MCP_PORT = process.env.MCP_PORT ? Number.parseInt(process.env.MCP_PORT, 10) : 4e3;
const app = createMcpExpressApp();
const server = await getServer();
const mcpPostHandler = async (req, res) => {
  const sessionId = req.headers.get("mcp-session-id");
  if (sessionId) {
    console.log(`Received MCP request for session: ${sessionId}`);
  } else {
    console.log("Request body:", req.body);
  }
  try {
    let transport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        // Enable resumability
        onsessioninitialized: (sessionId2) => {
          console.log(`Session initialized with ID: ${sessionId2}`);
          transports[sessionId2] = transport;
        }
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32e3,
          message: "Bad Request: No valid session ID provided"
        },
        id: null
      });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error"
        },
        id: null
      });
    }
  }
};
app.post("/mcp", mcpPostHandler);
const mcpGetHandler = async (req, res) => {
  const sessionId = req.headers.get("mcp-session-id");
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  const lastEventId = req.headers["last-event-id"];
  if (lastEventId) {
    console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
  } else {
    console.log(`Establishing new SSE stream for session ${sessionId}`);
  }
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};
app.get("/mcp", mcpGetHandler);
app.listen(MCP_PORT, (error) => {
  if (error) {
    console.error("Failed to start MCP Server:", error);
    process.exit(1);
  }
  console.log(`MCP Server is running on http://localhost:${MCP_PORT}`);
});
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log("Server shutdown complete");
  process.exit(0);
});
