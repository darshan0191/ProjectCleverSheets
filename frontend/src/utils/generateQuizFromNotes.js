// src/utils/generateQuizFromNotes.js

/**
 * Sends extracted text from notes to the backend API
 * to generate a multiple-choice quiz using Gemini.
 *
 * @param {string} notes - The extracted text from the uploaded PDF notes.
 * @param {number} numQuestions - Number of quiz questions to generate.
 * @returns {Promise<Array>} - An array of quiz questions with options and correct answers.
 */
export async function generateQuizFromNotes(notes, numQuestions = 5) {
    try {
        const response = await fetch("http://localhost:5000/api/generate-quiz", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ notes, numQuestions }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Backend Error:", errorText);
            throw new Error("Failed to generate quiz");
        }

        const data = await response.json();

        // Validate the returned quiz array
        if (!data.quiz || !Array.isArray(data.quiz)) {
            console.error("Invalid quiz data from backend:", data);
            throw new Error("Quiz data is invalid");
        }

        return data.quiz;
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw error;
    }
}
