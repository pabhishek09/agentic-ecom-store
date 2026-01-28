import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

const PRODUCT_API_URL = 'http://localhost:3000/product/'

export async function getProducts(): Promise<CallToolResult> {
    try {
        const response = await fetch(PRODUCT_API_URL)
        
        if (!response.ok) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error fetching products: ${response.status} ${response.statusText}`
                    }
                ],
                isError: true
            }
        }

        const products = await response.json()

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(products, null, 2)
                }
            ]
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return {
            content: [
                {
                    type: 'text',
                    text: `Error fetching products: ${errorMessage}`
                }
            ],
            isError: true
        }
    }
}

export const getProductsToolDefinition = {
    title: 'Get Products',
    description: 'Fetch all products from the e-commerce store',
}
