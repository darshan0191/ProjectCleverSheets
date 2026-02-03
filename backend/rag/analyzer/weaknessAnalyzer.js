// backend/rag/analyzer/weaknessAnalyzer.js

import taxonomy from "../taxonomy/index.js";

/**
 * @param {Array} quizHistory - user's quiz history
 * @returns {Object} weak & strong topics
 */
export function analyzeWeakness(quizHistory) {
    const topicStats = {};

    quizHistory.forEach(quiz => {
        quiz.quizData.forEach((q, idx) => {
            const topic = q.topic || "Unknown";
            if (!topicStats[topic]) {
                topicStats[topic] = { correct: 0, total: 0 };
            }

            topicStats[topic].total += 1;
            if (quiz.userAnswers[idx] === q.correctAnswer) {
                topicStats[topic].correct += 1;
            }
        });
    });

    const weak = [];
    const strong = [];

    Object.entries(topicStats).forEach(([topic, stats]) => {
        const accuracy = (stats.correct / stats.total) * 100;
        if (accuracy < 60) weak.push(topic);
        else strong.push(topic);
    });

    return { weak, strong };
}
