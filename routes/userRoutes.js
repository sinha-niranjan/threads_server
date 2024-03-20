import express from "express";

const router = express.Router();

router.post("/signup", (req, res) => res.send("Signed up successfully"));

export default router;
