import { Router } from 'express';
import { findAllProducts, findProductById, searchProducts } from '../../prisma/queries/products.js'

const router = Router();

// GET /product/
router.get('/', async (req, res) => {
  try {
    const products = await findAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /product/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await findProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// GET /product/search?q=...
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const results = await searchProducts(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search products' });
  }
});

export default router;