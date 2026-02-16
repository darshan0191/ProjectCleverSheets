import React, { useState, useEffect } from "react";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import "../styles/KnowledgeUploadPage.css";

const KnowledgeBaseUploadPage = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleUpload = async () => {
    if (!file) {
        setMessage("Please select a file first.");
        return;
    }

    try {
        setUploading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
            "http://localhost:5000/api/upload-knowledge",
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        setMessage("✅ " + data.message);
        console.log("Extracted Preview:", data.preview);

    } catch (err) {
        console.error(err);
        setMessage("❌ Upload failed. Check backend server.");
    } finally {
        setUploading(false);
    }
};


    const handleLogout = async () => {
        await auth.signOut();
        navigate("/");
    };

    const getInitials = (user) => {
        const name = user?.displayName || user?.email || "";
        if (!name) return "";
        const parts = name.split(" ");
        return parts.length === 1
            ? parts[0][0]
            : parts[0][0] + parts[parts.length - 1][0];
    };

    return (
        <div className="upload-page">

            {/* NAVBAR */}
            <nav className="navbar glassy-nav">
                <div className="navbar-left">
                    <h2 className="navbar-title">CleverSheets</h2>
                </div>

                <div className="navbar-center">
                    <button className="nav-btn" onClick={() => navigate("/")}>
                        Home
                    </button>
                    <button
                        className="nav-btn"
                        onClick={() => navigate("/dashboard")}
                    >
                        Dashboard
                    </button>
                    <button
                        className="nav-btn active-topic"
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

            {/* CONTENT */}
            <div className="upload-container">
                <h1>📂 Upload Knowledge Base</h1>
                <p>
                    Upload textbook, PPT, or PDF.  
                    The content will be used for adaptive RAG-based recommendations.
                </p>

                <div className="upload-card">
                    <input
                        type="file"
                        accept=".pdf,.docx,.pptx"
                        onChange={(e) => setFile(e.target.files[0])}
                    />

                    <button
                        className="upload-btn"
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading..." : "Upload & Process"}
                    </button>

                    {progress > 0 && (
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    {message && <p className="status-msg">{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBaseUploadPage;
