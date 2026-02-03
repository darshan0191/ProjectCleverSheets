import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import "../styles/home.css";

const HomePage = () => {
    const [user, setUser] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const navigate = useNavigate();

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
            navigate("/");
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
            {/* NAVBAR */}
            <nav className="navbar-glass">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>

                <div className="navbar-center">
                    <button className="nav-btn" onClick={() => navigate("/dashboard")}>
                        Dashboard
                    </button>
                    <button className="nav-btn" onClick={() => navigate("/generate")}>
                        Generate
                    </button>
                    <button className="nav-btn" onClick={() => navigate("/quiz-history")}>
                        Quiz History
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
                                <div className="profile-dropdown glass">
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

            {/* HERO SECTION */}
            <section className="hero-section">
                <div className="hero-content glass">
                    <h1 className="hero-title">The platform that knows you best. ✨</h1>
                    <p className="hero-subtitle">
                        Designed for your unique way of doing things.
                    </p>
                    <button className="get-started-btn" onClick={() => navigate("/generate")}>
                        Get Started 🚀
                    </button>
                </div>
            </section>

            {/* FEATURES */}
            <section className="features-section">
                <h2 className="section-title">Why Choose CleverSheets?</h2>
                <div className="features-grid">
                    <div className="feature-card glass">
                        <h3>Optimized Learning Efficiency</h3>
                        <p>targets your specific knowledge gaps so you can master topics faster without wasting time on what you already know.</p>
                    </div>
                    <div className="feature-card glass">
                        <h3>Increased Student Engagement</h3>
                        <p>adapts to your unique interests and learning style, making the content more relevant and motivating to complete.</p>
                    </div>
                    <div className="feature-card glass">
                        <h3>Stress Reduction and Confidence Building</h3>
                        <p>It moves at your personal pace, providing the right support at the right time to reduce stress and build a sense of achievement.</p>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="footer">
                <p>© {new Date().getFullYear()} CleverSheets — Learn Smarter, Not Harder 💡</p>
            </footer>
        </div>
    );
};

export default HomePage;
