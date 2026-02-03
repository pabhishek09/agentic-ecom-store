'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Product {
  id: number;
  product_id: string;
  name: string;
  author: string;
  language: string;
  category: string;
  keywords: string;
  image_url: string;
}

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/mcp-chat',
    }),
  });
  const [input, setInput] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    const mcpConnection = async () => {
      try {
        const response = await fetch('/api/client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: [] }),
        });
        if (!response.ok) {
          throw new Error('Failed to connect to MCP');
        }
        const data = await response.json();
        console.log('Connected to MCP successfully', data);
      } catch (err) {
        console.error('MCP connection error:', err);
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:3000/product');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        console.log(data);
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    // mcpConnection();
    fetchProducts();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Section - Product List */}
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Book Catalog</h1>
          
          {loading && (
            <div className="text-center text-gray-600 py-8">Loading books...</div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {!loading && !error && (
            <div className="grid gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200"
                >
                  <div className="flex gap-4">
                    {product.image_url && (
                      <div className="relative w-24 h-32 flex-shrink-0">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover rounded"
                          sizes="96px"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">by {product.author}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {product.category}
                        </span>
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {product.language}
                        </span>
                      </div>
                      {product.keywords && product.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {JSON.parse(product.keywords).map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Chat Interface */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Ask About Our Books</h2>
          <p className="text-sm text-gray-600 mt-1">
            Chat with our AI assistant to find the perfect book
          </p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg mb-2">👋 Welcome to our bookstore!</p>
              <p className="text-sm">Ask me anything about our books:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• "Show me dystopian novels"</li>
                <li>• "What books do you have by J.R.R. Tolkien?"</li>
                <li>• "Recommend a self-help book"</li>
              </ul>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-xs font-semibold mb-1 opacity-75">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {message.parts.map((part, index) =>
                    part.type === 'text' ? (
                      <span key={index}>{part.text}</span>
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {status === 'pending' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-6 border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                sendMessage({ text: input });
                setInput('');
              }
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== 'ready'}
              placeholder="Ask about books..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
            />
            <button
              type="submit"
              disabled={status !== 'ready' || !input.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
