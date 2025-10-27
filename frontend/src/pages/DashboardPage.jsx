// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css";

const DashboardPage = () => {
    const [user, setUser] = useState(null);
    const [quizHistory, setQuizHistory] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const navigate = useNavigate();

    // Track user
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            if (currentUser) fetchQuizHistory(currentUser.uid);
        });
        return () => unsubscribe();
    }, []);

    // Fetch quiz data
    const fetchQuizHistory = async (uid) => {
        try {
            const quizRef = collection(db, "users", uid, "quizHistory");
            const querySnapshot = await getDocs(quizRef);
            const historyData = querySnapshot.docs.map((doc) => doc.data());
            setQuizHistory(historyData);
        } catch (err) {
            console.error("Error fetching quiz history:", err);
        }
    };

    // Get unique topics
    const topics = [
        ...new Set(
            quizHistory.map((quiz) => quiz.quizTitle?.replace(".pdf", "") || "Untitled")
        ),
    ];

    // Filter quizzes by selected topic
    const filteredQuizzes = selectedTopic
        ? quizHistory.filter(
            (quiz) => quiz.quizTitle?.replace(".pdf", "") === selectedTopic
        )
        : [];

    // Calculate total quizzes solved
    const totalQuizzes = quizHistory.length;

    // Calculate overall accuracy
    const overallAccuracy =
        totalQuizzes > 0
            ? Math.round(
                quizHistory.reduce(
                    (acc, quiz) =>
                        acc + (quiz.correctAnswers / quiz.totalQuestions) * 100,
                    0
                ) / totalQuizzes
            )
            : 0;

    // Get initials
    const getInitials = (user) => {
        const displayName = user?.displayName || user?.email || "";
        if (!displayName) return "";
        const names = displayName.split(" ");
        const initials =
            names.length === 1
                ? names[0][0]
                : names[0][0] + names[names.length - 1][0];
        return initials.toUpperCase();
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            setShowProfile(false);
            setUser(null);
            navigate("/");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="dashboard-container">
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>

                <div className="navbar-center">
                    <button className="nav-btn" onClick={() => navigate("/")}>
                        Home
                    </button>
                    <button className="nav-btn" onClick={() => navigate("/quiz-history")}>
                        Quiz History
                    </button>
                    <button
                        className="nav-btn"
                        onClick={() => alert("Settings Coming Soon ⚙️")}
                    >
                        Settings
                    </button>
                </div>

                <div className="navbar-right">
                    {user ? (
                        <div className="profile-container">
                            <div
                                className="profile-icon"
                                onClick={() => setShowProfile(!showProfile)}
                            >
                                {getInitials(user)}
                            </div>

                            {showProfile && (
                                <div className="profile-dropdown">
                                    <p>
                                        <strong>Name:</strong> {user.displayName || "N/A"}
                                    </p>
                                    <p>
                                        <strong>Email:</strong> {user.email}
                                    </p>
                                    <button className="btn logout-btn" onClick={handleLogout}>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <button className="btn login-btn" onClick={() => navigate("/login")}>
                                Login
                            </button>
                            <button className="btn signup-btn" onClick={() => navigate("/signup")}>
                                Signup
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Dashboard Content */}
            <div className="dashboard-content-wrapper">
                <h2 className="dashboard-title">📊 User Dashboard</h2>
                <p className="dashboard-subtitle">
                    Track your progress, performance, and topics you’ve mastered.
                </p>

                <div className="dashboard-content">
                    {/* Left Side - Topics (Sticky) */}
                    <div className="topics-section">
                        <h3>📘 Topics</h3>
                        {topics.length > 0 ? (
                            <ul className="topics-list">
                                {topics.map((topic, index) => (
                                    <li
                                        key={index}
                                        className={selectedTopic === topic ? "active-topic" : ""}
                                        onClick={() => setSelectedTopic(topic)}
                                    >
                                        {topic}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-topics">No quizzes solved yet</p>
                        )}
                    </div>

                    {/* Center - Stats and Quiz History */}
                    <div className="center-section">
                        <div className="stat-card">
                            <h3>🧩 Total Quizzes Solved</h3>
                            <p className="stat-value">{totalQuizzes}</p>
                        </div>

                        <div className="stat-card">
                            <h3>🎯 Overall Accuracy</h3>
                            <p className="stat-value">{overallAccuracy}%</p>
                        </div>

                        {selectedTopic && (
                            <div className="topic-quiz-history">
                                <h3>📝 Quiz History for "{selectedTopic}"</h3>
                                {filteredQuizzes.length > 0 ? (
                                    <ul className="quiz-history-list">
                                        {filteredQuizzes.map((quiz, idx) => (
                                            <li key={idx}>
                                                {quiz.quizTitle.replace(".pdf", "")} —{" "}
                                                {quiz.correctAnswers}/{quiz.totalQuestions} correct
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-topics">No quizzes solved for this topic</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
