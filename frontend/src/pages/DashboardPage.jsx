// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css";

const DashboardPage = () => {
    const [user, setUser] = useState(null);
    const [quizHistory, setQuizHistory] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [topPerformer, setTopPerformer] = useState(null);
    const [initialAssessment, setInitialAssessment] = useState(null);

    // 🔥 Adaptive learning states
    const [recommendedContent, setRecommendedContent] = useState([]);
    const [weakTopics, setWeakTopics] = useState([]);
    const [strongTopics, setStrongTopics] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    const navigate = useNavigate();

    // ================= AUTH =================
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchQuizHistory(currentUser.uid);
                fetchInitialAssessment(currentUser.uid);
                fetchTopPerformer();
            }
        });
        return () => unsubscribe();
    }, []);

    // ================= FIRESTORE =================
    const fetchQuizHistory = async (uid) => {
        try {
            const quizRef = collection(db, "users", uid, "quizHistory");
            const snap = await getDocs(quizRef);
            setQuizHistory(snap.docs.map((d) => d.data()));
        } catch (err) {
            console.error("Error fetching quiz history:", err);
        }
    };

    const fetchInitialAssessment = async (uid) => {
        try {
            const assessRef = collection(db, "users", uid, "assessmentHistory");
            const q = query(assessRef, orderBy("createdAt", "desc"), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) setInitialAssessment(snap.docs[0].data());
        } catch (err) {
            console.error("Error fetching initial assessment:", err);
        }
    };

    const fetchTopPerformer = async () => {
        try {
            const usersRef = collection(db, "users");
            const usersSnap = await getDocs(usersRef);

            let topUser = null;
            let maxQuizzes = 0;

            for (const userDoc of usersSnap.docs) {
                const quizSnap = await getDocs(
                    collection(db, "users", userDoc.id, "quizHistory")
                );

                if (quizSnap.size > maxQuizzes) {
                    maxQuizzes = quizSnap.size;
                    topUser = {
                        name:
                            userDoc.data().displayName ||
                            userDoc.data().email ||
                            "Unknown User",
                        totalQuizzes: quizSnap.size,
                    };
                }
            }

            setTopPerformer(topUser);
        } catch (err) {
            console.error("Error fetching top performer:", err);
        }
    };

    // ================= ADAPTIVE LEARNING =================
    useEffect(() => {
        if (quizHistory.length === 0) return;

        const fetchAdaptiveLearning = async () => {
            try {
                setLoadingRecommendations(true);

                const res = await fetch(
                    "http://localhost:5000/api/adaptive-learning",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            subject: "Java",
                            quizHistory,
                        }),
                    }
                );

                const data = await res.json();

                setWeakTopics(data.weakTopics || []);
                setStrongTopics(data.strongTopics || []);
                setRecommendedContent(data.recommendedContent || []);
            } catch (err) {
                console.error("Adaptive learning fetch failed:", err);
            } finally {
                setLoadingRecommendations(false);
            }
        };

        fetchAdaptiveLearning();
    }, [quizHistory]);

    // ================= DERIVED DATA =================
    const topics = [
        ...new Set(
            quizHistory.map(
                (quiz) => quiz.quizTitle?.replace(".pdf", "") || "Untitled"
            )
        ),
    ];

    const filteredQuizzes = selectedTopic
        ? quizHistory.filter(
              (quiz) =>
                  quiz.quizTitle?.replace(".pdf", "") === selectedTopic
          )
        : [];

    const totalQuizzes = quizHistory.length;

    const overallAccuracy =
        totalQuizzes === 0
            ? 0
            : Math.round(
                  quizHistory.reduce(
                      (acc, quiz) =>
                          acc +
                          (quiz.correctAnswers / quiz.totalQuestions) * 100,
                      0
                  ) / totalQuizzes
              );

    const getInitials = (user) => {
        const displayName = user?.displayName || user?.email || "";
        if (!displayName) return "";
        const names = displayName.split(" ");
        return names.length === 1
            ? names[0][0]
            : names[0][0] + names[names.length - 1][0];
    };

    const handleLogout = async () => {
        await auth.signOut();
        navigate("/");
    };

    // ================= UI =================
    return (
        <div className="dashboard-page">
            {/* NAVBAR */}
            <nav className="navbar glassy-nav">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>

                <div className="navbar-center">
                    <button className="nav-btn" onClick={() => navigate("/")}>
                        Home
                    </button>

                    {/* ✅ NEW BUTTON */}
                    <button
                        className="nav-btn"
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

            {/* CONTENT */}
            <div className="dashboard-scroll">
                <div className="dashboard-header glassy-card">
                    <h2>📊 User Dashboard</h2>
                    <p>
                        Track progress and get personalized learning
                        recommendations
                    </p>
                </div>

                {/* INITIAL ASSESSMENT */}
                {initialAssessment && (
                    <div className="glassy-card" style={{ marginBottom: "2rem" }}>
                        <h3>🧠 Initial Skill Assessment</h3>
                        <p>
                            <strong>Score:</strong>{" "}
                            {initialAssessment.result.score} /{" "}
                            {initialAssessment.result.total}
                        </p>
                    </div>
                )}

                {/* 🎯 RECOMMENDATIONS */}
                <div className="glassy-card" style={{ marginBottom: "2rem" }}>
                    <h3>🎯 Personalized Learning Recommendations</h3>

                    {loadingRecommendations && (
                        <p style={{ color: "#9ca3af" }}>
                            Analyzing your weak areas...
                        </p>
                    )}

                    {!loadingRecommendations &&
                        recommendedContent.length === 0 && (
                            <p style={{ color: "#9ca3af" }}>
                                No recommendations yet.
                            </p>
                        )}

                    {recommendedContent.map((item, i) => (
                        <div
                            key={i}
                            style={{
                                marginTop: "14px",
                                padding: "14px",
                                borderRadius: "12px",
                                background:
                                    "rgba(255,255,255,0.08)",
                            }}
                        >
                            <h4>{item.topic}</h4>
                            <p style={{ fontSize: "0.9rem" }}>
                                {item.material.summary}
                            </p>

                            <button
                                className="btn"
                                onClick={() =>
                                    navigate("/learn", {
                                        state: {
                                            topic: item.topic,
                                            material: item.material,
                                        },
                                    })
                                }
                            >
                                Start Learning →
                            </button>
                        </div>
                    ))}
                </div>

                {/* STATS */}
                <div className="dashboard-grid">
                    <div className="topics-section glassy-card">
                        <h3>📘 Topics</h3>
                        <ul className="topics-list">
                            {topics.map((topic, index) => (
                                <li
                                    key={index}
                                    className={
                                        selectedTopic === topic
                                            ? "active-topic"
                                            : ""
                                    }
                                    onClick={() =>
                                        setSelectedTopic(topic)
                                    }
                                >
                                    {topic}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="stats-section glassy-card">
                        <div className="stat">
                            <h3>Total Quizzes</h3>
                            <p className="stat-value">{totalQuizzes}</p>
                        </div>

                        <div className="stat">
                            <h3>Overall Accuracy</h3>
                            <p className="stat-value">
                                {overallAccuracy}%
                            </p>
                        </div>

                        {selectedTopic && (
                            <div className="topic-details">
                                <h4>{selectedTopic} History</h4>
                                <ul>
                                    {filteredQuizzes.map((quiz, idx) => (
                                        <li key={idx}>
                                            {quiz.correctAnswers}/
                                            {quiz.totalQuestions} correct
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
