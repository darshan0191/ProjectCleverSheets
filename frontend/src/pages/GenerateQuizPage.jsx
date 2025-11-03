import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { generateQuizFromNotes } from "../utils/generateQuizFromNotes";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import { auth, db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import "../styles/GenerateQuizPage.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const GenerateQuizPage = () => {
    const [fileName, setFileName] = useState("");
    const [quiz, setQuiz] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [numQuestions, setNumQuestions] = useState(5);
    const [quizTime, setQuizTime] = useState(10);
    const [timeLeft, setTimeLeft] = useState(0);
    const [navAttempts, setNavAttempts] = useState(0);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showExitButton, setShowExitButton] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const navigate = useNavigate();
    const dingSound = useRef(null);

    useEffect(() => {
        dingSound.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        dingSound.current.volume = 0.7;
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        if (quiz.length > 0 && !showResults) {
            handleNavigationAttempt();
            return;
        }
        try {
            await auth.signOut();
            setShowProfile(false);
            setUser(null);
            navigate("/");
        } catch (err) {
            console.error(err);
        }
    };

    const handleNavigationAttempt = () => {
        setNavAttempts((prev) => {
            const newCount = prev + 1;
            if (newCount < 4) {
                alert(`⚠️ Submit the quiz first! (${newCount}/3 warnings)`);
                dingSound.current?.play();
            } else {
                alert("🚨 Too many attempts! Auto-submitting your quiz.");
                dingSound.current?.play();
                handleSubmit(true);
            }
            return newCount;
        });
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden" && quiz.length > 0 && !showResults) {
                setTabSwitchCount((prev) => {
                    const newCount = prev + 1;
                    if (newCount < 4) {
                        alert(`⚠️ You switched tabs! (${newCount}/3 warnings). Auto-submission on the 4th.`);
                        dingSound.current?.play();
                    } else {
                        alert("🚨 Too many tab switches! Auto-submitting quiz!");
                        dingSound.current?.play();
                        handleSubmit(true);
                    }
                    return newCount;
                });
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [quiz.length, showResults]);

    const getInitials = (user) => {
        const displayName = user?.displayName || user?.email || "";
        if (!displayName) return "";
        const names = displayName.split(" ");
        return names.length === 1
            ? names[0][0].toUpperCase()
            : (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };

    const extractTextFromPDF = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            let pageText = textContent.items.map((item) => item.str).join(" ");
            if (!pageText.trim()) {
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d");
                await page.render({ canvasContext: ctx, viewport }).promise;
                const ocrResult = await Tesseract.recognize(canvas, "eng");
                pageText = ocrResult.data.text;
            }
            fullText += pageText + "\n";
        }

        if (!fullText.trim()) throw new Error("No readable text found in PDF");
        return fullText;
    };

    const onDrop = useCallback(
        async (acceptedFiles) => {
            const file = acceptedFiles[0];
            setFileName(file.name);
            setError("");
            setLoading(true);
            setQuiz([]);
            setShowResults(false);
            setCurrentQuestion(0);
            setNavAttempts(0);
            setTabSwitchCount(0);

            try {
                const docElm = document.documentElement;
                if (docElm.requestFullscreen) await docElm.requestFullscreen();
                setIsFullscreen(true);

                const text = await extractTextFromPDF(file);
                const quizData = await generateQuizFromNotes(text, numQuestions);
                setQuiz(quizData);
                setTimeLeft(quizTime * 60);
            } catch (err) {
                console.error(err);
                setError("Error generating quiz. Please try again.");
            } finally {
                setLoading(false);
            }
        },
        [numQuestions, quizTime]
    );

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: { "application/pdf": [] },
    });

    useEffect(() => {
        if (quiz.length > 0 && !showResults && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (quiz.length > 0 && timeLeft === 0 && !showResults) {
            handleSubmit(true);
        }
    }, [quiz.length, timeLeft, showResults]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? "0" + (s % 60) : s % 60}`;

    const handleAnswerSelect = (qIndex, option) => {
        if (!showResults) setUserAnswers((p) => ({ ...p, [qIndex]: option }));
    };

    const handleSubmit = async (autoSubmit = false) => {
        setShowResults(true);
        const correctCount = quiz.filter((q, i) => userAnswers[i] === q.correctAnswer).length;
        if (document.fullscreenElement) document.exitFullscreen?.();
        setIsFullscreen(false);

        if (user) {
            try {
                const ref = collection(db, "users", user.uid, "quizHistory");
                await addDoc(ref, {
                    quizTitle: fileName || "Generated Quiz",
                    date: serverTimestamp(),
                    totalQuestions: quiz.length,
                    correctAnswers: correctCount,
                    userAnswers,
                    quizData: quiz,
                    quizTime,
                    autoSubmitted: autoSubmit,
                    tabSwitchCount,
                });
            } catch (err) {
                console.error("🔥 Error saving quiz:", err);
            }
        }
    };

    const exitFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        setIsFullscreen(false);
    };

    const handleSafeNavigation = (path) => {
        if (quiz.length > 0 && !showResults) handleNavigationAttempt();
        else navigate(path);
    };

    return (
        <div className="generate-page">
            {!isFullscreen && (
                <nav className="navbar glass-navbar">
                    <h2 className="navbar-logo">CleverSheets</h2>
                    <div className="navbar-links">
                        <button onClick={() => handleSafeNavigation("/")}>Home</button>
                        <button onClick={() => handleSafeNavigation("/quiz-history")}>Quiz History</button>
                        <button onClick={() => alert("Feedback Feature Coming Soon 💬")}>Feedback</button>
                    </div>
                    <div className="navbar-profile">
                        {user ? (
                            <div className="profile-container">
                                <div className="profile-icon" onClick={() => setShowProfile(!showProfile)}>
                                    {getInitials(user)}
                                </div>
                                {showProfile && (
                                    <div className="profile-dropdown glass-effect">
                                        <p><strong>{user.displayName || "User"}</strong></p>
                                        <p>{user.email}</p>
                                        <button onClick={handleLogout}>Logout</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <button onClick={() => handleSafeNavigation("/login")}>Login</button>
                                <button onClick={() => handleSafeNavigation("/signup")}>Signup</button>
                            </>
                        )}
                    </div>
                </nav>
            )}

            {!quiz.length && !isFullscreen && (
                <div className="generate-section">
                    <div className="intro glass-effect">
                        <h1>🧠 Generate AI-Powered Quizzes</h1>
                        <p>
                            Upload your notes or PDFs and let <strong>CleverSheets</strong> instantly transform them
                            into interactive quizzes. Choose your desired number of questions and set the quiz time.
                            Engage smarter — learn faster.
                        </p>
                    </div>

                    <div className="controls glass-effect">
                        <label>Number of Questions:</label>
                        <select value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}>
                            {[5, 10, 15, 20].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>

                        <label>Quiz Time (minutes):</label>
                        <select value={quizTime} onChange={(e) => setQuizTime(Number(e.target.value))}>
                            {[5, 10, 15, 20].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    <div {...getRootProps({ className: "upload-area glass-effect" })}>
                        <input {...getInputProps()} />
                        <p>📄 Drag & Drop or Click to Upload Your PDF</p>
                        <small>Supports text & scanned files (OCR supported)</small>
                    </div>
                </div>
            )}

            {loading && <p className="loading glass-effect">⏳ Generating Your Quiz...</p>}
            {error && <p className="error glass-effect">{error}</p>}

            {quiz.length > 0 && (
                <div className="quiz-box glass-effect">
                    <div className="timer">⏱ Time Left: {formatTime(timeLeft)}</div>
                    {!showResults && (
                        <>
                            <h2>Question {currentQuestion + 1} / {quiz.length}</h2>
                            <h3>{quiz[currentQuestion].question}</h3>
                            <div className="options">
                                {quiz[currentQuestion].options.map((option, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleAnswerSelect(currentQuestion, option)}
                                        className={`option-btn ${userAnswers[currentQuestion] === option ? "selected" : ""}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                            <div className="nav-buttons">
                                <button disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(p => p - 1)}>⬅ Prev</button>
                                {currentQuestion === quiz.length - 1 ? (
                                    <button onClick={() => handleSubmit(false)}>Submit Quiz</button>
                                ) : (
                                    <button onClick={() => setCurrentQuestion(p => p + 1)}>Next ➡</button>
                                )}
                            </div>
                        </>
                    )}

                    {showResults && (
                        <div className="results">
                            <h3>✅ Quiz Completed!</h3>
                            <p>You got {quiz.filter((q, i) => userAnswers[i] === q.correctAnswer).length} / {quiz.length} correct.</p>
                            <p>🧭 Tab Switches: {tabSwitchCount}</p>
                            <button onClick={() => window.location.reload()}>Try Another Quiz</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GenerateQuizPage;
