import { streamText, convertToCoreMessages } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Fetch products from the store API
    const productsResponse = await fetch('http://localhost:3000/product/');
    const products = await productsResponse.json();

    // Create a system message with product context
    const systemMessage = `You are a helpful bookstore assistant. You can help users find books and answer questions about our catalog.
    
Here is our current book catalog:
${JSON.stringify(products, null, 2)}

When users ask about books, provide helpful, friendly recommendations based on our catalog. Include details like:
- Book title and author
- Category and language
- Keywords/themes
- Brief description if relevant

If a user asks for books by category, author, or keywords, search through the catalog and provide relevant matches.`;

    const result = streamText({
      model: google('gemini-2.0-flash-exp'),
      system: systemMessage,
      messages: convertToCoreMessages(messages),
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
