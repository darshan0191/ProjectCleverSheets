import { getTaxonomy } from "../taxonomy/index.js";

/**
 * Analyze quiz history and find weak topics
 */
export function analyzePerformance(subject, quizHistory) {
    const taxonomy = getTaxonomy(subject);

    const topicScores = {};

    for (const quiz of quizHistory) {
        quiz.quizData.forEach((q, idx) => {
            const topic = q.topic; // you will tag this later
            if (!topic) return;

            if (!topicScores[topic]) {
                topicScores[topic] = { correct: 0, total: 0 };
            }

            topicScores[topic].total += 1;
            if (quiz.userAnswers[idx] === q.correctAnswer) {
                topicScores[topic].correct += 1;
            }
        });
    }

    const weakTopics = Object.entries(topicScores)
        .filter(([_, v]) => v.correct / v.total < 0.6)
        .map(([topic]) => topic);

    const strongTopics = Object.entries(topicScores)
        .filter(([_, v]) => v.correct / v.total >= 0.8)
        .map(([topic]) => topic);

    return { weakTopics, strongTopics };
}
