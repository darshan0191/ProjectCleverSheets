// backend/rag/analyzer/masteryAnalyzer.js

/**
 * Analyze mastery per topic
 * @param {Array} quizHistory
 */
export function analyzeMastery(quizHistory) {
    const stats = {};

    quizHistory.forEach((attempt) => {
        attempt.topicBreakdown?.forEach(({ topic, correct, total }) => {
            if (!stats[topic]) {
                stats[topic] = { correct: 0, total: 0 };
            }
            stats[topic].correct += correct;
            stats[topic].total += total;
        });
    });

    const mastery = {};

    for (const topic in stats) {
        const accuracy = stats[topic].correct / stats[topic].total;

        mastery[topic] = {
            accuracy,
            level:
                accuracy >= 0.75 ? "strong" :
                    accuracy >= 0.4 ? "medium" :
                        "weak"
        };
    }

    return mastery;
}
