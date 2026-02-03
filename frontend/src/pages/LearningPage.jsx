import React, { useEffect, useState } from "react";
import { learningMaterial } from "../data/learningMaterial";
import { auth, db } from "../firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/LearningMaterialPage.css";

const QUIZ_SIZE = 2; // number of questions per attempt

// 🔀 Utility to shuffle array
const shuffleArray = (array) => {
    return [...array].sort(() => Math.random() - 0.5);
};

const LearningPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const recommendedTopic = state?.topic;
    const topics = Object.keys(learningMaterial);

    const [selectedTopic, setSelectedTopic] = useState(
        recommendedTopic || topics[0]
    );
    const [currentQuiz, setCurrentQuiz] = useState([]);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    const material = learningMaterial[selectedTopic];

    // 🔥 Load NEW quiz on topic change OR retry
    useEffect(() => {
        if (!material) return;

        const newQuiz = shuffleArray(material.quizPool).slice(
            0,
            QUIZ_SIZE
        );

        setCurrentQuiz(newQuiz);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
    }, [selectedTopic]);

    const handleOptionSelect = (qIdx, option) => {
        setAnswers((prev) => ({ ...prev, [qIdx]: option }));
    };

    const handleSubmitQuiz = async () => {
        const correct = currentQuiz.filter(
            (q, i) => answers[i] === q.correct
        ).length;

        const accuracy = correct / currentQuiz.length;

        setScore(correct);
        setSubmitted(true);

        const user = auth.currentUser;
        if (!user) return;

        // 🔥 Update mastery (adaptive signal)
        await setDoc(
            doc(db, "users", user.uid, "topicMastery", selectedTopic),
            {
                topic: selectedTopic,
                accuracy,
                level:
                    accuracy >= 0.7
                        ? "Strong"
                        : accuracy >= 0.4
                        ? "Medium"
                        : "Weak",
                updatedAt: serverTimestamp(),
                source: "learning_material",
            },
            { merge: true }
        );
    };

    const handleNextAttempt = () => {
        const nextQuiz = shuffleArray(material.quizPool).slice(
            0,
            QUIZ_SIZE
        );
        setCurrentQuiz(nextQuiz);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
    };

    if (!material) {
        return <div className="learning-page">No content found.</div>;
    }

    return (
        <div className="learning-page">
            <h1>📘 Learning Material – Java</h1>

            {/* TOPIC SELECTOR */}
            <div className="topic-tabs">
                {topics.map((topic) => (
                    <button
                        key={topic}
                        className={
                            selectedTopic === topic ? "active" : ""
                        }
                        onClick={() => setSelectedTopic(topic)}
                    >
                        {topic}
                    </button>
                ))}
            </div>

            {/* EXPLANATION */}
            <div className="topic-card">
                <h2>{selectedTopic}</h2>
                <p style={{ whiteSpace: "pre-line" }}>
                    {material.explanation}
                </p>
            </div>

            {/* QUIZ */}
            <div className="quiz-card">
                <h3>📝 Practice Quiz</h3>

                {currentQuiz.map((q, i) => (
                    <div key={i} className="question">
                        <p>
                            <strong>Q{i + 1}:</strong> {q.question}
                        </p>

                        {q.options.map((opt) => (
                            <label key={opt} className="option">
                                <input
                                    type="radio"
                                    name={`q-${i}`}
                                    disabled={submitted}
                                    onChange={() =>
                                        handleOptionSelect(i, opt)
                                    }
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                ))}

                {!submitted ? (
                    <button className="submit-btn" onClick={handleSubmitQuiz}>
                        Submit Quiz
                    </button>
                ) : (
                    <div className="result">
                        ✅ Score: {score} / {currentQuiz.length}
                        <br />

                        <button
                            className="submit-btn"
                            style={{ marginTop: "10px" }}
                            onClick={handleNextAttempt}
                        >
                            Try Another Quiz 🔄
                        </button>

                        <button
                            className="submit-btn"
                            style={{ marginTop: "10px" }}
                            onClick={() => navigate("/dashboard")}
                        >
                            Back to Dashboard →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LearningPage;
