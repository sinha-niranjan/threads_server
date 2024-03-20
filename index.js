import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
dotenv.config();

await connectDB();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json()); // To parse JSON data in the req.body
app.use(express.urlencoded({ extended: true })); // To parse form data in the req.body
app.use(cookieParser());

// Routes
app.use("/api/users", userRoutes);

app.get("/", (_, res) => {
  res.send({ message: "heelo" });
});

app.listen(PORT, () => {
  console.log("Server started at http://localhost:" + PORT);
});
