// src/pages/QuizDisplay.jsx
import React, { useState } from "react";
import { db, auth } from "../firebase/config";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

const QuizDisplay = ({ quiz }) => {
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    // When user selects an option
    const handleOptionSelect = (questionIndex, selectedOption) => {
        setUserAnswers((prev) => ({
            ...prev,
            [questionIndex]: selectedOption,
        }));
    };

    // Handle quiz submission
    const handleSubmit = async () => {
        const resultsArray = quiz.map((q, index) => {
            const isCorrect = userAnswers[index] === q.correctAnswer;
            return {
                question: q.question,
                selected: userAnswers[index] || "No answer",
                correct: q.correctAnswer,
                isCorrect,
                options: q.options,
            };
        });

        setResults(resultsArray);
        setShowResults(true);

        // Save to Firestore
        const correctCount = resultsArray.filter((r) => r.isCorrect).length;
        const user = auth.currentUser;
        if (!user) {
            setSaveMessage("⚠️ You must be logged in to save quiz history.");
            return;
        }

        setSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                quizHistory: arrayUnion({
                    timestamp: new Date().toISOString(),
                    score: correctCount,
                    totalQuestions: quiz.length,
                    questions: resultsArray,
                }),
            });
            setSaveMessage("✅ Quiz results saved to history!");
        } catch (error) {
            console.error("Error saving quiz:", error);
            setSaveMessage("❌ Failed to save quiz results.");
        } finally {
            setSaving(false);
        }
    };

    // Count correct answers
    const correctCount = results.filter((r) => r.isCorrect).length;

    return (
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            {!showResults ? (
                <>
                    {quiz.map((q, idx) => (
                        <div
                            key={idx}
                            style={{
                                border: "1px solid #ccc",
                                padding: "15px",
                                marginBottom: "15px",
                                borderRadius: "5px",
                            }}
                        >
                            <h4>
                                Q{idx + 1}: {q.question}
                            </h4>
                            <div>
                                {q.options.map((opt, i) => (
                                    <div key={i} style={{ margin: "5px 0" }}>
                                        <label>
                                            <input
                                                type="radio"
                                                name={`question-${idx}`}
                                                value={opt}
                                                checked={userAnswers[idx] === opt}
                                                onChange={() => handleOptionSelect(idx, opt)}
                                            />{" "}
                                            {opt}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleSubmit}
                        style={{
                            padding: "10px 20px",
                            fontSize: "16px",
                            borderRadius: "5px",
                            cursor: "pointer",
                        }}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Submit Quiz"}
                    </button>
                </>
            ) : (
                <div>
                    <h3>
                        You got {correctCount} out of {quiz.length} correct
                    </h3>
                    <hr />
                    {results.map((res, idx) => (
                        <div key={idx} style={{ marginBottom: "20px" }}>
                            <h4>
                                Q{idx + 1}: {res.question}
                            </h4>
                            <p>
                                Your answer:{" "}
                                <span
                                    style={{
                                        color: res.isCorrect ? "green" : "red",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {res.selected}
                                </span>{" "}
                                {res.isCorrect ? "✅ Correct" : "❌ Wrong"}
                            </p>
                            {!res.isCorrect && (
                                <p>
                                    Correct answer:{" "}
                                    <span style={{ color: "green", fontWeight: "bold" }}>
                                        {res.correct}
                                    </span>
                                </p>
                            )}
                            <hr />
                        </div>
                    ))}

                    {saveMessage && (
                        <p
                            style={{
                                color: saveMessage.includes("✅") ? "green" : "red",
                                fontWeight: "bold",
                            }}
                        >
                            {saveMessage}
                        </p>
                    )}

                    <button
                        onClick={() => {
                            setShowResults(false);
                            setUserAnswers({});
                            setResults([]);
                            setSaveMessage("");
                        }}
                        style={{
                            padding: "10px 20px",
                            fontSize: "16px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            marginTop: "10px",
                        }}
                    >
                        Retake Quiz
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuizDisplay;
