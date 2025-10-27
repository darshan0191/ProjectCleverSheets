// src/pages/QuizPage.jsx
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/quizpage.css";

function QuizPage() {
    const location = useLocation();
    const { quiz } = location.state || { quiz: [] };
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const handleOptionChange = (questionId, value) => {
        setAnswers({ ...answers, [questionId]: value });
    };

    const handleSubmit = () => {
        if (Object.keys(answers).length < quiz.length) {
            alert("Please answer all questions before submitting!");
            return;
        }
        setSubmitted(true);
    };

    return (
        <div className="quiz-page-container">
            <h1>Quiz</h1>
            {quiz.length === 0 ? (
                <p>No quiz available. Go back and generate one!</p>
            ) : (
                <form>
                    {quiz.map((q) => (
                        <div key={q.id} className="quiz-question">
                            <p>
                                <strong>Q{q.id}:</strong> {q.question}
                            </p>
                            {q.options.map((opt, idx) => (
                                <label key={idx} className="quiz-option">
                                    <input
                                        type="radio"
                                        name={`question-${q.id}`}
                                        value={opt}
                                        disabled={submitted}
                                        checked={answers[q.id] === opt}
                                        onChange={() => handleOptionChange(q.id, opt)}
                                    />
                                    {opt}
                                </label>
                            ))}
                            {submitted && (
                                <p className="correct-answer">
                                    Correct Answer: {q.correctAnswer}
                                </p>
                            )}
                        </div>
                    ))}
                    {!submitted && (
                        <button type="button" onClick={handleSubmit}>
                            Submit Quiz
                        </button>
                    )}
                </form>
            )}
        </div>
    );
}

export default QuizPage;
