import express from "express";
import { runAdaptiveRAG } from "../rag/ragPipeline.js";

const router = express.Router();

router.post("/adaptive-learning", async (req, res) => {
    try {
        const { subject, quizHistory } = req.body;

        const result = await runAdaptiveRAG({ subject, quizHistory });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Adaptive learning failed" });
    }
});

export default router;
