import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/QuizHistoryPage.css";

const QuizHistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [expandedQuiz, setExpandedQuiz] = useState(null);
    const [zoomingOut, setZoomingOut] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await fetchHistory(currentUser);
            } else {
                setUser(null);
                setHistory([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchHistory = async (user) => {
        try {
            const quizHistoryRef = collection(db, "users", user.uid, "quizHistory");
            const q = query(quizHistoryRef, orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            const historyData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setHistory(historyData);
        } catch (err) {
            console.error("Error fetching history:", err);
        }
    };

    const openQuiz = (id) => {
        setExpandedQuiz(id);
        // Scroll to top of container so first row is fully visible
        const container = document.querySelector(".quiz-history-container");
        if (container) container.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeQuiz = () => {
        setZoomingOut(true);
        setTimeout(() => {
            setExpandedQuiz(null);
            setZoomingOut(false);
        }, 300);
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            setShowProfile(false);
            setUser(null);
        } catch (err) {
            console.error(err);
        }
    };

    const getInitials = (user) => {
        const displayName = user?.displayName || user?.email || "";
        const names = displayName.split(" ");
        const initials = names.length === 1
            ? names[0][0]
            : names[0][0] + names[names.length - 1][0];
        return initials.toUpperCase();
    };

    if (loading) return <p className="loading-text">Loading history...</p>;
    if (!user) return <p className="login-text">Please log in to view your quiz history.</p>;

    return (
        <div className="quiz-history-page">
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>
                <div className="navbar-center">
                    <button className="nav-btn" onClick={() => navigate("/")}>Home</button>
                    <button className="nav-btn" onClick={() => navigate("/generate")}>Generate Quiz</button>
                    <button className="nav-btn" onClick={() => alert("Feedback Coming Soon 💬")}>Feedback</button>
                </div>
                <div className="navbar-right">
                    {user ? (
                        <div className="profile-container">
                            <div className="profile-icon" onClick={() => setShowProfile(!showProfile)}>
                                {getInitials(user)}
                            </div>
                            {showProfile && (
                                <div className="profile-dropdown">
                                    <p><strong>Name:</strong> {user.displayName}</p>
                                    <p><strong>Email:</strong> {user.email}</p>
                                    <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <button className="btn login-btn" onClick={() => navigate("/login")}>Login</button>
                            <button className="btn signup-btn" onClick={() => navigate("/signup")}>Signup</button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <div className="quiz-history-container">
                <h2 className="page-title">📜 Your Quiz History</h2>
                {history.length === 0 && <p className="no-history-text">No quizzes attempted yet.</p>}

                <div className="quiz-grid">
                    {history.map((h) => (
                        <div
                            key={h.id}
                            className={`quiz-card ${expandedQuiz === h.id ? (zoomingOut ? "zoom-out" : "zoomed") : ""}`}
                            onClick={() => !expandedQuiz && openQuiz(h.id)}
                        >
                            <div className="quiz-header">
                                <div>
                                    <p className="quiz-date">
                                        <strong>Date:</strong> {h.date?.toDate ? h.date.toDate().toLocaleString() : h.date}
                                    </p>
                                    <p className="quiz-score">
                                        <strong>Score:</strong> {h.correctAnswers} / {h.totalQuestions}
                                    </p>
                                </div>
                            </div>

                            {expandedQuiz === h.id && (
                                <div className="quiz-details zoomed-details">
                                    <button className="close-btn" onClick={closeQuiz}><X size={20} /></button>
                                    {h.quizData?.map((item, idx) => {
                                        const userAnswer = h.userAnswers?.[idx];
                                        const correctAnswer = item.correctAnswer;
                                        const isCorrect = userAnswer === correctAnswer;
                                        return (
                                            <div key={idx} className="question-box">
                                                <h4 className="question-text">Q{idx + 1}: {item.question}</h4>
                                                <ul className="options-list">
                                                    {item.options?.map((opt, i) => {
                                                        let optionClass = "option";
                                                        if (opt === correctAnswer) optionClass += " correct";
                                                        if (opt === userAnswer && opt !== correctAnswer) optionClass += " wrong";
                                                        return <li key={i} className={optionClass}>{opt}</li>;
                                                    })}
                                                </ul>
                                                <p className="answer-text"><strong>Your Answer:</strong>{" "}
                                                    <span className={isCorrect ? "text-correct" : "text-wrong"}>{userAnswer || "No answer"}</span>
                                                </p>
                                                <p className="answer-text"><strong>Correct Answer:</strong>{" "}
                                                    <span className="text-correct">{correctAnswer || "Not available"}</span>
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuizHistoryPage;
