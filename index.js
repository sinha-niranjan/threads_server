import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
dotenv.config();

await connectDB();
const app = express();
const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send({ message: "heelo" });
});

app.listen(PORT, () => {
  console.log("Server started at http://localhost:" + PORT);
});
