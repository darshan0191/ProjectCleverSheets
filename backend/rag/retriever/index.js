import { ChromaClient } from "chromadb";

const chroma = new ChromaClient({
    host: "localhost",
    port: 8000,
});

export async function getRetriever(subject) {
    const collectionName = `${subject.toLowerCase()}_knowledge_base`;

    const collection = await chroma.getCollection({
        name: collectionName,
    });

    return {
        async getRelevantDocuments(query, k = 4) {
            const results = await collection.query({
                queryTexts: [query],
                nResults: k,
            });

            return results.documents[0].map((text) => ({
                pageContent: text,
            }));
        },
    };
}
