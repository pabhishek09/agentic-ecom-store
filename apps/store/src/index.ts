import express from "express";
import morgan from "morgan";
import productRouter from "./api/product.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use('/product', productRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
