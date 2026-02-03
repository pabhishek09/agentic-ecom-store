import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ListToolsResult, ListResourcesResult, ListResourceTemplatesResult } from "@modelcontextprotocol/sdk/types.js";

const mcpClientUrl = new URL("http://localhost:4000/mcp");
const transport = new StreamableHTTPClientTransport(mcpClientUrl);


const client = new Client(
  {
    name: "web mcp client",
    version: "1.0.0"
  }
);
let tools: ListToolsResult | undefined;
let resources: ListResourcesResult | undefined;
let templates: ListResourceTemplatesResult | undefined;
let isConnected = false;

async function initializeClient() {
  if (isConnected) {
    return;
  }
  
  await client.connect(transport);
  isConnected = true;
  
  // List tools
  tools = await client.listTools();
  for (const tool of tools.tools) {
      console.log("Tool: ", tool.name);
  }
  // List resources
  resources = await client.listResources();
  for(const resource in resources.resources) {
      console.log("Resource: ", resource);
  }
  // List resource templates
  templates = await client.listResourceTemplates();
  for(const template of templates.resourceTemplates) {
      console.log("Resource template: ", template.name);
  }
}

// Initialize on module load
initializeClient().catch((error) => {
  console.error("Failed to initialize MCP client: ", error);
});

export async function POST(req: Request) {
  try {
    // Ensure client is initialized before responding
    await initializeClient();
    await req.json();

    return new Response(JSON.stringify({
      tools,
      resources,
      templates,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
