import express from "express";
import productRouter from "./api/product.js";

const app = express();

app.use(express.json());
app.use('/product', productRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
