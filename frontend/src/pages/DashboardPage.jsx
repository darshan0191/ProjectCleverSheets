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

    // ================= NAVBAR HELPERS =================
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

    // ================= UI =================
    return (
        <div className="dashboard-page">

            {/* 🔥 UPDATED NAVBAR */}
            <nav className="navbar glassy-nav">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>

                <div className="navbar-center">
                    <button
                        className="nav-btn"
                        onClick={() => navigate("/dashboard")}
                    >
                        Dashboard
                    </button>

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

                    {/* 🔥 NEW BUTTON */}
                    <button
                        className="nav-btn"
                        onClick={() => navigate("/upload-knowledge")}
                    >
                        Upload Knowledge
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

            {/* ================= CONTENT ================= */}

            <div className="dashboard-scroll">
                <div className="dashboard-header glassy-card">
                    <h2>📊 User Dashboard</h2>
                    <p>
                        Track progress and get personalized learning recommendations.
                    </p>
                </div>

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

                {topPerformer && (
                    <div className="top-performer glassy-card">
                        <h3>🏆 Top Performer</h3>
                        <p>
                            <strong>{topPerformer.name}</strong> —{" "}
                            {topPerformer.totalQuizzes} quizzes
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
