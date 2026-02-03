// backend/rag/ragPipeline.js
import { analyzeMastery } from "./analyzer/masteryAnalyzer.js";
import { generateLearningPlan } from "./generator/learningGenerator.js";

export async function runAdaptiveRAG({ subject, quizHistory }) {
    const mastery = analyzeMastery(quizHistory);

    const learningPlan = await generateLearningPlan(subject, mastery);

    return {
        subject,
        mastery,
        learningPlan
    };
}
