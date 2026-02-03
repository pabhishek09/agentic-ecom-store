import express from "express";
import morgan from "morgan";
import cors from 'cors';




import productRouter from "./api/product.js";

const app = express();

app.use(cors(['http://localhost:5000', 'http://localhost:4000', 'http://localhost:6274']));
app.use(morgan("dev"));
app.use(express.json());
app.use('/product', productRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
