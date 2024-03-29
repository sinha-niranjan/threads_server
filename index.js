import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { v2 as cloudinary } from "cloudinary";
import { app, server } from "./socket/socket.js";

dotenv.config();

await connectDB();

const PORT = process.env.PORT || 4000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middlewares
app.use(express.json({ limit: "50mb" })); // To parse JSON data in the req.body and limits 40mb shows that now it can get upto 40 mb in the req.body it more than previous now there is no issue to get any iamges of large size
app.use(express.urlencoded({ extended: true })); // To parse form data in the req.body
app.use(cookieParser());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/post", postRoutes);
app.use("/api/message", messageRoutes);

app.get("/", (_, res) => {
  res.send({ message: "heelo" });
});

server.listen(PORT, () => {
  console.log("Server started at http://localhost:" + PORT);
});
