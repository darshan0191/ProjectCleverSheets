// backend/rag/utils/jsonExtractor.js

export function extractJSON(text) {
    if (!text || typeof text !== "string") return null;

    // Remove markdown code blocks
    const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    // Extract JSON object
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) return null;

    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    } catch (err) {
        console.error("❌ JSON parse failed");
        return null;
    }
}
