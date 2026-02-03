import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { queryVectorDB } from "../queryVectorDB.js";
import { extractJSON } from "../utils/jsonExtractor.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateLearningContent(topic) {
    console.log(`🧠 Generating learning content for: ${topic}`);

    // 1️⃣ Retrieve context from Vector DB
    console.log("🟡 Querying ChromaDB...");
    const contextDocs = await queryVectorDB(topic, 5);

    const context = contextDocs.join("\n\n");

    // 2️⃣ Prompt Gemini
    const prompt = `
You are an adaptive learning tutor.

TASK:
Generate structured learning material for the topic "${topic}".

RULES:
- Return ONLY valid JSON
- NO markdown
- NO explanations outside JSON

JSON FORMAT:
{
  "topic": "${topic}",
  "level": "Beginner | Intermediate | Advanced",
  "summary": "Short explanation",
  "keyPoints": ["...", "..."],
  "examples": ["...", "..."],
  "commonMistakes": ["...", "..."],
  "recommendedNextTopics": ["...", "..."],
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A"
    }
  ]
}

CONTEXT:
${context}
`;

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(prompt);
    const rawText = await result.response.text();

    // 3️⃣ Extract JSON safely
    const parsed = extractJSON(rawText);

    if (!parsed) {
        throw new Error("❌ Failed to parse learning JSON");
    }

    console.log("✅ Learning content generated successfully");
    return parsed;
}
