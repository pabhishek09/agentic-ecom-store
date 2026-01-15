import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../../lib/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProductData {
  id: string;
  name: string;
  author: string;
  language: string;
  category: string;
  keywords: string[];
  image_url: string;
}

interface PriceData {
  book_id: string;
  price_gbp: number;
  discount_percent: number;
  discounted_price: number;
  stock: number;
}

async function main() {
  try {
    console.log("Starting seed data ingestion...");

    // Read JSON files
    const productsPath = path.join(__dirname, "./data", "products.json");
    const pricesPath = path.join(__dirname, "./data", "prices.json");

    const productsData: ProductData[] = JSON.parse(
      fs.readFileSync(productsPath, "utf-8")
    );
    const pricesData: PriceData[] = JSON.parse(
      fs.readFileSync(pricesPath, "utf-8")
    );

    console.log(`Found ${productsData.length} products and ${pricesData.length} prices`);

    // Ingest products
    console.log("Ingesting products...");
    for (const product of productsData) {
      await prisma.product.upsert({
        where: { book_id: product.id },
        update: {
          name: product.name,
          author: product.author,
          language: product.language,
          category: product.category,
          keywords: JSON.stringify(product.keywords),
          image_url: product.image_url,
        },
        create: {
          book_id: product.id,
          name: product.name,
          author: product.author,
          language: product.language,
          category: product.category,
          keywords: JSON.stringify(product.keywords),
          image_url: product.image_url,
        },
      });
    }
    console.log("Products ingested successfully");

    // Ingest prices
    console.log("Ingesting prices...");
    for (const price of pricesData) {
      await prisma.price.upsert({
        where: { book_id: price.book_id },
        update: {
          price_gbp: price.price_gbp,
          discount_percent: price.discount_percent,
          discounted_price: price.discounted_price,
          stock: price.stock,
        },
        create: {
          book_id: price.book_id,
          price_gbp: price.price_gbp,
          discount_percent: price.discount_percent,
          discounted_price: price.discounted_price,
          stock: price.stock,
        },
      });
    }
    console.log("Prices ingested successfully");

    console.log("Seed data ingestion completed!");
  } catch (error) {
    console.error("Error during seed data ingestion:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
