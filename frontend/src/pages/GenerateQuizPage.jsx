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
        dingSound.current = new Audio(
            "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
        );
        dingSound.current.volume = 0.7;
    }, []);

    // Track user
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Handle logout
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
        const initials =
            names.length === 1
                ? names[0][0]
                : names[0][0] + names[names.length - 1][0];
        return initials.toUpperCase();
    };

    const extractTextFromPDF = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            let pageText = textContent.items.map((item) => item.str).join(" ");
            fullText += pageText + "\n";

            // If no text found, use OCR on canvas image
            if (!pageText.trim()) {
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d");

                await page.render({ canvasContext: ctx, viewport }).promise;
                const ocrResult = await Tesseract.recognize(canvas, "eng", {
                    logger: (m) => console.log(m),
                });
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
                // Fullscreen on quiz start
                const docElm = document.documentElement;
                if (docElm.requestFullscreen) await docElm.requestFullscreen();
                else if (docElm.webkitRequestFullscreen) await docElm.webkitRequestFullscreen();
                else if (docElm.msRequestFullscreen) await docElm.msRequestFullscreen();

                setIsFullscreen(true);

                const text = await extractTextFromPDF(file);
                const quizData = await generateQuizFromNotes(text, numQuestions);
                if (typeof quizData === "string") {
                    alert("The quiz format isn't structured properly. Try again.");
                } else {
                    setQuiz(quizData);
                    setTimeLeft(quizTime * 60);
                }
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

    // Timer
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

        if (document.fullscreenElement) {
            document.exitFullscreen?.();
        }
        setIsFullscreen(false);

        const user = auth.currentUser;
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
                    autoSubmitted,
                    tabSwitchCount,
                });
            } catch (err) {
                console.error("Error saving quiz history:", err);
            }
        }
    };

    // Exit button visibility
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (
                e.clientY < 80 &&
                e.clientX > window.innerWidth / 3 &&
                e.clientX < (2 * window.innerWidth) / 3
            ) {
                setShowExitButton(true);
            } else {
                setShowExitButton(false);
            }
        };
        if (isFullscreen) {
            window.addEventListener("mousemove", handleMouseMove);
        }
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [isFullscreen]);

    const exitFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        setIsFullscreen(false);
    };

    const handleSafeNavigation = (path) => {
        if (quiz.length > 0 && !showResults) handleNavigationAttempt();
        else navigate(path);
    };

    return (
        <div className="generate-quiz-container">
            {showExitButton && (
                <div className="exit-fullscreen-btn" onClick={exitFullscreen}>
                    ⬆ Exit Fullscreen
                </div>
            )}

            {/* Navbar is hidden in fullscreen */}
            {!isFullscreen && (
                <nav className="navbar">
                    <div className="navbar-left"><h2 className="navbar-title">CleverSheets</h2></div>
                    <div className="navbar-center">
                        <button className="nav-btn" onClick={() => handleSafeNavigation("/")}>Home</button>
                        <button className="nav-btn" onClick={() => handleSafeNavigation("/quiz-history")}>Quiz History</button>
                        <button className="nav-btn" onClick={() => alert("Feedback Feature Coming Soon 💬")}>Feedback</button>
                    </div>
                    <div className="navbar-right">
                        {user ? (
                            <div className="profile-container">
                                <div className="profile-icon" onClick={() => setShowProfile(!showProfile)}>{getInitials(user)}</div>
                                {showProfile && (
                                    <div className="profile-dropdown">
                                        <p><strong>Name:</strong> {user.displayName || "N/A"}</p>
                                        <p><strong>Email:</strong> {user.email}</p>
                                        <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <button className="btn login-btn" onClick={() => handleSafeNavigation("/login")}>Login</button>
                                <button className="btn signup-btn" onClick={() => handleSafeNavigation("/signup")}>Signup</button>
                            </>
                        )}
                    </div>
                </nav>
            )}

            {/* Upload Section */}
            {!quiz.length && !isFullscreen && (
                <>
                    <div className="generate-title-section">
                        <h1>🧠 CleverSheets: Notes to Quiz Converter</h1>
                        <p>This tool serves as your personal Notes to Quiz Converter, bridging the gap
                            between passive note-taking and active learning. It instantly analyzes your
                            documents using AI, extracts key facts, and generates structured, custom quizzes.
                            Stop wasting time manually preparing study questions; turn your materials into
                            reliable assessment tools for instant recall and mastery.</p>
                    </div>

                    <div className="selectors-container">
                        <div>
                            <label>Number of Questions: </label>
                            <select value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}>
                                {[5, 10, 15, 20].map((num) => <option key={num} value={num}>{num}</option>)}
                            </select>
                        </div>

                        <div>
                            <label>Quiz Time (minutes): </label>
                            <select value={quizTime} onChange={(e) => setQuizTime(Number(e.target.value))}>
                                {[5, 10, 15, 20].map((min) => <option key={min} value={min}>{min}</option>)}
                            </select>
                        </div>
                    </div>

                    <div {...getRootProps({ className: "upload-box" })}>
                        <input {...getInputProps()} />
                        <p>📄 Drag & drop or click to upload a PDF</p>
                    </div>
                </>
            )}

            {loading && <p className="loading">⏳ Generating Quiz...</p>}
            {error && <p className="error">{error}</p>}

            {/* Quiz Section */}
            {quiz.length > 0 && (
                <div className="quiz-section">
                    <div className="timer-display">⏱ Time Left: {formatTime(timeLeft)}</div>
                    {!showResults && <h2>🧠 Question {currentQuestion + 1} of {quiz.length}</h2>}

                    {!showResults && (
                        <div className="question-card">
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
                        </div>
                    )}

                    {!showResults && (
                        <div className="navigation-buttons">
                            <button disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((p) => p - 1)}>⬅ Prev</button>
                            {currentQuestion === quiz.length - 1 ? (
                                <button className="submit-btn" onClick={() => handleSubmit(false)}>Submit Quiz</button>
                            ) : (
                                <button onClick={() => setCurrentQuestion((p) => p + 1)}>Next ➡</button>
                            )}
                        </div>
                    )}

                    {/* Results */}
                    {showResults && (
                        <div className="results-box">
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
