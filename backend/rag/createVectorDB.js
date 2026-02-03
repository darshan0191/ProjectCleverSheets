// rag/createVectorDB.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ChromaClient } from "chromadb";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "embedding-001" });

const chroma = new ChromaClient({
    host: "localhost",
    port: 8000
});

const taxonomy = JSON.parse(
    fs.readFileSync("./rag/taxonomy/java.taxonomy.json", "utf-8")
);

async function embedText(text) {
    const result = await embedModel.embedContent({
        content: { parts: [{ text }] }
    });
    return result.embedding.values;
}

async function createVectorDB() {
    console.log("🚀 Creating Java Vector Database...");

    const collection = await chroma.getOrCreateCollection({
        name: "java_knowledge_base"
    });

    for (const topic of taxonomy.topics) {
        for (const sub of topic.subtopics) {
            const filePath = path.join(
                "./rag/knowledge/java",
                `${sub.id}.txt`
            );

            if (!fs.existsSync(filePath)) continue;

            const content = fs.readFileSync(filePath, "utf-8");

            console.log(`🔹 Embedding: ${sub.id}`);

            const embedding = await embedText(content);

            await collection.add({
                ids: [`java_${sub.id}`],
                documents: [content],
                embeddings: [embedding],
                metadatas: [
                    {
                        subject: "Java",
                        topicId: topic.id,
                        subtopicId: sub.id,
                        difficulty: topic.level
                    }
                ]
            });
        }
    }

    console.log("✅ Java Vector DB created successfully");
}

createVectorDB().catch(console.error);
