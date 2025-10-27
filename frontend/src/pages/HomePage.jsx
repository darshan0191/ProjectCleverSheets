import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import "../styles/home.css";

function HomePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

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
        if (!displayName) return "";
        const names = displayName.split(" ");
        const initials =
            names.length === 1
                ? names[0][0]
                : names[0][0] + names[names.length - 1][0];
        return initials.toUpperCase();
    };

    return (
        <div className="home-container">
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>

                <div className="navbar-center">
                    <button className="nav-btn" onClick={() => navigate("/dashboard")}>
                        Dashboard
                    </button>
                    <button
                        className="nav-btn"
                        onClick={() => alert("Settings Coming Soon ⚙️")}
                    >
                        Settings
                    </button>
                    <button
                        className="nav-btn"
                        onClick={() => alert("Feedback Feature Coming Soon 💬")}
                    >
                        Feedback
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
                                        <strong>Name:</strong> {user.displayName}
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
                        <div className="auth-buttons">
                            <button
                                className="btn login-btn"
                                onClick={() => navigate("/login")}
                            >
                                Login
                            </button>
                            <button
                                className="btn signup-btn"
                                onClick={() => navigate("/signup")}
                            >
                                Signup
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <div className="home-main-content">
                <h1 className="home-title-bold">🧠 Notes to Quiz Converter</h1>
                <p className="home-subtitle-light">
                    Turn your notes into engaging quizzes instantly!
                </p>

                {user ? (
                    <div className="home-card-grid">
                        <div
                            className="home-card-action"
                            onClick={() => navigate("/generate")}
                        >
                            <h2>Generate Quiz</h2>
                            <p>Create interactive quizzes from your notes.</p>
                        </div>

                        <div
                            className="home-card-action"
                            onClick={() => navigate("/quiz-history")}
                        >
                            <h2>📜 View Quiz History</h2>
                            <p>Check all your previous quiz attempts.</p>
                        </div>
                    </div>
                ) : (
                    <p className="login-message">Login or Signup to access features</p>
                )}
            </div>
        </div>
    );
}

export default HomePage;
