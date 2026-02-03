// backend/rag/retriever/retrieveContext.js

import { queryVectorDB } from "../queryVectorDB.js";

export async function retrieveContext(topic, subject = "java") {
    const query = `${subject} ${topic} explanation with examples`;
    const results = await queryVectorDB(query, subject);

    return results.join("\n");
}
