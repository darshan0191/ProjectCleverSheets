// backend/rag/queryVectorDB.js

import { ChromaClient } from "chromadb";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

/* ---------------- Path Setup (ESM Safe) ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Absolute path to embedder.py
const EMBEDDER_PATH = path.join(__dirname, "embedder.py");

/* ---------------- Chroma Client ---------------- */
const chroma = new ChromaClient({
    host: "localhost",
    port: 8000,
});

/* ---------------- Python Embedding Call ---------------- */
function embedText(text) {
    return new Promise((resolve, reject) => {
        const py = spawn("python", [EMBEDDER_PATH]);

        let output = "";
        let error = "";

        // send text via stdin (SAFE)
        py.stdin.write(text);
        py.stdin.end();

        py.stdout.on("data", (data) => {
            output += data.toString();
        });

        py.stderr.on("data", (data) => {
            error += data.toString();
        });

        py.on("close", (code) => {
            if (error) {
                return reject(`Python error: ${error}`);
            }

            try {
                const embedding = JSON.parse(output);
                resolve(embedding);
            } catch (err) {
                reject("❌ Failed to parse embedding JSON from Python");
            }
        });
    });
}

/* ---------------- Query Vector DB ---------------- */
export async function queryVectorDB(queryText, topK = 3) {
    try {
        console.log("🟡 Generating embedding...");
        const embedding = await embedText(queryText);

        console.log("🟡 Querying ChromaDB...");
        const collection = await chroma.getCollection({
            name: "java_knowledge_base",
        });

        const results = await collection.query({
            queryEmbeddings: [embedding],
            nResults: topK,
        });

        return results.documents?.[0] || [];
    } catch (err) {
        console.error("❌ queryVectorDB failed:", err);
        throw err;
    }
}
