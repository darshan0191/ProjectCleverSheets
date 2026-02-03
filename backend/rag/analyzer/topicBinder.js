// backend/rag/analyzer/topicBinder.js
import { loadTaxonomy } from "../taxonomy/index.js";

/**
 * Bind taxonomy topics to searchable vector queries
 */
export function bindTopics(subject) {
    const taxonomy = loadTaxonomy(subject);

    const bindings = [];

    for (const [topic, subtopics] of Object.entries(taxonomy.topics)) {
        for (const sub of subtopics) {
            bindings.push({
                subject,
                topic,
                subtopic: sub,
                searchQuery: `${subject} ${topic} ${sub} explained with examples`
            });
        }
    }

    return bindings;
}
