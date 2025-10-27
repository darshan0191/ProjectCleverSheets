// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: try to find and parse JSON array/object inside arbitrary text
function extractJsonFromText(text) {
    if (!text || typeof text !== "string") return null;

    const arrayStart = text.indexOf("[");
    const arrayEnd = text.lastIndexOf("]");
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        const possible = text.slice(arrayStart, arrayEnd + 1);
        try { return JSON.parse(possible); } catch (e) { }
    }

    const objStart = text.indexOf("{");
    const objEnd = text.lastIndexOf("}");
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
        const possibleObj = text.slice(objStart, objEnd + 1);
        try {
            const parsed = JSON.parse(possibleObj);
            if (Array.isArray(parsed)) return parsed;
            if (parsed.quiz && Array.isArray(parsed.quiz)) return parsed.quiz;
            if (parsed.question && parsed.options) return [parsed];
        } catch (e) { }
    }

    return null;
}

// Fallback parser: parse Q/A blocks into structured quiz
function fallbackParseQuizFromText(raw) {
    if (!raw || typeof raw !== "string") return null;
    const text = raw.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
    const blocks = text.split(/\n(?=\s*\d+\.|\s*Q\d+[:.])/).map(b => b.trim()).filter(Boolean);
    const quiz = [];

    for (const block of blocks) {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;
        let qLine = lines[0].replace(/^\s*(?:Q\s*\d+[:.]|\d+[).:]?)\s*/i, "").trim();

        const options = [];
        let correctAnswer = null;

        for (let i = 1; i < lines.length; i++) {
            const l = lines[i];
            const optMatch = l.match(/^[A-D]\s*[)\.\-]\s*(.+)/i);
            if (optMatch) { options.push(optMatch[1].trim()); continue; }
            const optMatch2 = l.match(/^([A-D])\s*[:\-]?\s*(.+)/i);
            if (optMatch2 && optMatch2[2]) { options.push(optMatch2[2].trim()); continue; }
            const ansMatch = l.match(/(?:Answer|Correct)\s*[:\-]\s*([A-D]|[A-D]\)|[A-D]\.)\s*(.*)?/i);
            if (ansMatch) {
                const letter = ansMatch[1].replace(/\D/g, "").length ? null : ansMatch[1].trim().replace(/\)|\./g, "");
                if (letter && /^[A-D]$/i.test(letter)) correctAnswer = letter.toUpperCase();
                else if (ansMatch[2]) correctAnswer = ansMatch[2].trim();
                continue;
            }
            if (options.length === 0) qLine += " " + l;
        }

        if (correctAnswer && /^[A-D]$/.test(correctAnswer) && options.length >= 1) {
            const index = correctAnswer.charCodeAt(0) - 65;
            if (options[index]) correctAnswer = options[index];
        }

        if (!correctAnswer) {
            for (const optLine of lines.slice(1)) {
                const idx = optLine.match(/^[A-D]\s*[)\.\-]\s*(.+?)(?:\s*\(correct\)|\s*\[correct\]|\s*\(right\))/i);
                if (idx && idx[1]) { correctAnswer = idx[1].trim(); break; }
            }
        }

        if (options.length < 2) {
            const optTextMatch = block.match(/A[\)\.\-].*?B[\)\.\-].*?C[\)\.\-].*?D[\)\.\-].*/s);
            if (optTextMatch) {
                const parts = block.split(/(?=[A-D]\s*[)\.\-])/).map(p => p.trim()).filter(Boolean);
                options.length = 0;
                for (const p of parts) {
                    const m = p.replace(/^[A-D]\s*[)\.\-]\s*/, "").trim();
                    if (m) options.push(m);
                }
            }
        }

        if (!options || options.length === 0) continue;
        if (!correctAnswer) correctAnswer = options[0];

        quiz.push({ question: qLine, options, correctAnswer });
    }

    return quiz.length > 0 ? quiz : null;
}

// API endpoint
app.post("/api/generate-quiz", async (req, res) => {
    try {
        console.log("✅ /api/generate-quiz hit");
        const { notes, numQuestions } = req.body;

        if (!notes || !notes.trim()) return res.status(400).json({ error: "No notes provided" });

        const questionsCount = numQuestions && Number(numQuestions) > 0 ? Number(numQuestions) : 5;

        const prompt = `
You are a quiz-generation assistant.

TASK:
From the provided study notes, generate exactly ${questionsCount} multiple-choice questions (MCQs).
Each question must have exactly 4 options.

RESPONSE FORMAT (must be valid JSON only, nothing else):
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B"
  },
  ...
]

Do NOT include any commentary or explanation. Return ONLY the JSON array.

NOTES:
${notes}
`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log("🤖 sending prompt to model (length chars):", prompt.length);
        const result = await model.generateContent(prompt);
        const raw = await result.response.text();
        console.log("🧾 raw model output preview (first 1000 chars):", raw.slice(0, 1000));

        let quiz = extractJsonFromText(raw);
        if (!quiz) {
            const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (fenced && fenced[1]) quiz = extractJsonFromText(fenced[1]);
        }
        if (!quiz) quiz = fallbackParseQuizFromText(raw);

        if (!Array.isArray(quiz) || quiz.length === 0) {
            console.error("❌ Final quiz parsing failed. RAW:", raw.slice(0, 5000));
            return res.status(500).json({ error: "Failed to parse quiz from model output.", raw: raw.slice(0, 5000) });
        }

        const sanitized = quiz.map((q, idx) => {
            const question = (q.question || "").trim();
            const options = Array.isArray(q.options) ? q.options.map(o => (o || "").trim()) : [];
            let correctAnswer = q.correctAnswer ? (q.correctAnswer || "").trim() : null;

            if (correctAnswer && /^[A-D]$/i.test(correctAnswer)) {
                const index = correctAnswer.toUpperCase().charCodeAt(0) - 65;
                if (options[index]) correctAnswer = options[index];
            }

            if (options.length < 4) {
                const fallbackParts = options.length === 1 ? options[0].split(/\s*[\/;]\s*/) : [];
                while (options.length < 4 && fallbackParts.length > options.length) {
                    options.push(fallbackParts[options.length]?.trim());
                }
            }

            return {
                question: question || `Question ${idx + 1}`,
                options: options.length ? options.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: correctAnswer || (options[0] || "Option A"),
            };
        });

        console.log("✅ Parsed quiz items:", sanitized.length);
        res.json({ quiz: sanitized });
    } catch (err) {
        console.error("🔥 Error in /api/generate-quiz:", err);
        res.status(500).json({ error: "Error generating or parsing quiz" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
