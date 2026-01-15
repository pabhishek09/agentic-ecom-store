import express from "express";
import { findAllProducts } from "prisma/queries/products.js";


// const app = express();

// app.get("/", (req, res) => {
//   res.send("Welcome to the Agentic Ecom Store!");
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

await findAllProducts().then((products) => {
  console.log("Products:", products);
});
