import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const mcpClientUrl = new URL("http://localhost:4000/mcp");
const transport = new StreamableHTTPClientTransport(mcpClientUrl);

const client = new Client({
  name: "web mcp client",
  version: "1.0.0"
});

let isConnected = false;
let availableTools: Tool[] = [];

async function initializeClient() {
  if (isConnected) {
    return;
  }
  
  await client.connect(transport);
  isConnected = true;
  
  // List available tools from MCP server
  const toolsResult = await client.listTools();
  availableTools = toolsResult.tools;
  
  console.log("MCP Tools available:", availableTools.map(t => t.name));
}

// Initialize on module load
initializeClient().catch((error) => {
  console.error("Failed to initialize MCP client: ", error);
});

export async function POST(req: Request) {
  try {
    // Ensure client is initialized
    await initializeClient();
    
    const { messages } = await req.json();

    // Fetch products using MCP tool
    let productsData = [];
    try {
      const result = await client.callTool({
        name: "get_products",
        arguments: {}
      });
      
      // Parse the tool result
      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text' && 'text' in content) {
          productsData = JSON.parse(content.text);
        }
      }
    } catch (error) {
      console.error("Error calling MCP tool:", error);
    }

    // Create a system message with product context from MCP
    const systemMessage = `You are a helpful bookstore assistant powered by the Model Context Protocol (MCP). You can help users find books and answer questions about our catalog.

Here is our current book catalog (fetched via MCP):
${JSON.stringify(productsData, null, 2)}

When users ask about books, provide helpful, friendly recommendations based on our catalog. Include details like:
- Book title and author
- Category and language
- Keywords/themes
- Brief description if relevant

If a user asks for books by category, author, or keywords, search through the catalog and provide relevant matches.`;

    const result = streamText({
      model: google('gemini-2.0-flash-exp'),
      system: systemMessage,
      messages,
      // maxSteps: 5,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('MCP Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
