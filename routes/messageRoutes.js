import express from "express";
import { getConversations, getMessages, sendMessage } from "../controllers/messageController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.get("/:otherUserId", protectRoute, getConversations);
router.get("/conversations", protectRoute, getMessages);
router.post("/", protectRoute, sendMessage);

export default router;
