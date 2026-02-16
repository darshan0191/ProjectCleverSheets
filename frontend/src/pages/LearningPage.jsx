import React, { useEffect, useState } from "react";
import { learningMaterial } from "../data/learningMaterial";
import { auth, db } from "../firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/LearningMaterialPage.css";

const QUIZ_SIZE = 2;

// 🔀 Shuffle Utility
const shuffleArray = (array) => {
    return [...array].sort(() => Math.random() - 0.5);
};

const LearningPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const recommendedTopic = state?.topic;
    const topics = Object.keys(learningMaterial);

    const [user, setUser] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

    const [selectedTopic, setSelectedTopic] = useState(
        recommendedTopic || topics[0]
    );
    const [currentQuiz, setCurrentQuiz] = useState([]);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    const material = learningMaterial[selectedTopic];

    // 🔐 Auth Listener
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // 🔥 Load new quiz when topic changes
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

        if (!user) return;

        // 🔥 Update Mastery
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

    const handleLogout = async () => {
        await auth.signOut();
        navigate("/");
    };

    const getInitials = (user) => {
        const displayName = user?.displayName || user?.email || "";
        if (!displayName) return "";
        const names = displayName.split(" ");
        return names.length === 1
            ? names[0][0]
            : names[0][0] + names[names.length - 1][0];
    };

    if (!material) {
        return <div className="learning-page">No content found.</div>;
    }

    return (
        <div className="learning-page">

            {/* 🔥 NAVBAR */}
            <nav className="navbar glassy-nav">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>

                <div className="navbar-center">
                    <button className="nav-btn" onClick={() => navigate("/")}>
                        Home
                    </button>

                    <button
                        className="nav-btn active-topic"
                        onClick={() => navigate("/learn")}
                    >
                        Learning Material
                    </button>

                    <button
                        className="nav-btn"
                        onClick={() => navigate("/quiz-history")}
                    >
                        Quiz History
                    </button>
                </div>

                <div className="navbar-right">
                    {user && (
                        <div className="profile-container">
                            <div
                                className="profile-icon"
                                onClick={() =>
                                    setShowProfile(!showProfile)
                                }
                            >
                                {getInitials(user)}
                            </div>

                            {showProfile && (
                                <div className="profile-dropdown glassy-card">
                                    <p>{user.email}</p>
                                    <button
                                        className="btn logout-btn"
                                        onClick={handleLogout}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* PAGE CONTENT */}
            <div style={{ padding: "2rem", maxWidth: "900px", margin: "auto" }}>

                {/* Topic Selector */}
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

                {/* Explanation */}
                <div className="topic-card">
        <h2>{selectedTopic}</h2>
        <p style={{ whiteSpace: "pre-line" }}>
            {material.explanation}
        </p>
    </div>

                {/* Quiz Section */}
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
        </div>
    );
};

export default LearningPage;
