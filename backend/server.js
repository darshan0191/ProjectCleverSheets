// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

/* ---------------- PATH SETUP ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- LOAD TAXONOMY SAFELY ---------------- */
function loadTaxonomy(subject) {
    const taxonomyPath = path.join(
        __dirname,
        "rag",
        "taxonomy",
        `${subject}.taxonomy.json`
    );

    if (!fs.existsSync(taxonomyPath)) {
        throw new Error(`Taxonomy file not found: ${taxonomyPath}`);
    }

    return JSON.parse(fs.readFileSync(taxonomyPath, "utf-8"));
}

let javaTaxonomy;
try {
    javaTaxonomy = loadTaxonomy("java");
    console.log("✅ Java taxonomy loaded");
} catch (err) {
    console.error("❌ Failed to load taxonomy:", err.message);
}

/* ---------------- GEMINI SETUP ---------------- */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ---------------- HELPER: JSON extraction ---------------- */
function extractJsonFromText(text) {
    if (!text || typeof text !== "string") return null;

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
        try {
            return JSON.parse(text.slice(start, end + 1));
        } catch {
            return null;
        }
    }
    return null;
}

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        taxonomyLoaded: !!javaTaxonomy,
    });
});

/* ---------------- API: GENERATE QUIZ ---------------- */
app.post("/api/generate-quiz", async (req, res) => {
    try {
        console.log("✅ /api/generate-quiz hit");

        const { notes, numQuestions } = req.body;
        if (!notes || !notes.trim()) {
            return res.status(400).json({ error: "No notes provided" });
        }

        const questionsCount = Number(numQuestions) || 10;

        /* Allowed topics from taxonomy */
        const allowedTopics = Object.values(javaTaxonomy.topics).flat();
        const validTopics = new Set(allowedTopics);

        const prompt = `
You are a university-level exam paper setter.

TASK:
Generate exactly ${questionsCount} MCQs from the given NOTES.

RULES:
1. Each question MUST belong to exactly ONE topic from this list:
${allowedTopics.join(", ")}

2. Add a "topic" field for every question.
3. Each question must have exactly 4 options.
4. Difficulty must match university exams.
5. Return ONLY valid JSON (no explanation, no markdown).

FORMAT:
[
  {
    "question": "Question text",
    "topic": "Inheritance",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "B"
  }
]

NOTES:
${notes}
`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const result = await model.generateContent(prompt);
        const raw = await result.response.text();

        let quiz = extractJsonFromText(raw);

        if (!Array.isArray(quiz) || quiz.length === 0) {
            return res.status(500).json({
                error: "Failed to parse quiz from model output",
                raw,
            });
        }

        const sanitizedQuiz = quiz.map((q, idx) => {
            let topic = q.topic?.trim();
            if (!validTopics.has(topic)) topic = "Miscellaneous";

            const options = Array.isArray(q.options)
                ? q.options.slice(0, 4).map(o => o.trim())
                : ["Option A", "Option B", "Option C", "Option D"];

            return {
                question: q.question?.trim() || `Question ${idx + 1}`,
                topic,
                options,
                correctAnswer: options.includes(q.correctAnswer)
                    ? q.correctAnswer
                    : options[0],
            };
        });

        console.log(`✅ Quiz generated: ${sanitizedQuiz.length} questions`);
        res.json({ quiz: sanitizedQuiz });
    } catch (err) {
        console.error("🔥 Error generating quiz:", err);
        res.status(500).json({ error: "Quiz generation failed" });
    }
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 CleverSheets backend running on http://localhost:${PORT}`);
});
