import React, { useEffect, useState } from "react";
import { assessmentQuestions } from "../data/assessmentQuestions";
import { auth, db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/AssessmentPage.css";

const AssessmentPage = () => {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [user, setUser] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) navigate("/login");
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleSelect = (option) => {
    setAnswers({ ...answers, [current]: option });
  };

  const handleNext = () => {
    if (current < assessmentQuestions.length - 1) {
      setCurrent(current + 1);
    }
  };

  const handleFinish = async () => {
    let score = 0;
    const topicStats = {};

    assessmentQuestions.forEach((q, idx) => {
      if (!topicStats[q.topic]) {
        topicStats[q.topic] = { correct: 0, total: 0 };
      }
      topicStats[q.topic].total += 1;

      if (answers[idx] === q.correctAnswer) {
        score += 1;
        topicStats[q.topic].correct += 1;
      }
    });

    const topicAnalysis = Object.entries(topicStats).map(
      ([topic, stat]) => ({
        topic,
        accuracy: stat.correct / stat.total,
        level:
          stat.correct / stat.total >= 0.75
            ? "Strong"
            : stat.correct / stat.total >= 0.4
            ? "Medium"
            : "Weak"
      })
    );

    const result = {
      score,
      total: assessmentQuestions.length,
      topicAnalysis
    };

    setResultData(result);
    setShowResult(true);

    await addDoc(
      collection(db, "users", user.uid, "assessmentHistory"),
      {
        answers,
        result,
        createdAt: serverTimestamp()
      }
    );
  };

  // ================= RESULT VIEW =================
  if (showResult && resultData) {
    return (
      <div className="assessment-page">
        <div className="assessment-card">
          <h2>🎉 Assessment Completed</h2>

          <p className="score">
            Score: <strong>{resultData.score}</strong> / {resultData.total}
          </p>

          <div className="topic-result">
            <h3>📊 Topic Analysis</h3>
            {resultData.topicAnalysis.map((t, i) => (
              <div key={i} className={`topic-row ${t.level.toLowerCase()}`}>
                <span>{t.topic}</span>
                <span>{Math.round(t.accuracy * 100)}%</span>
                <span>{t.level}</span>
              </div>
            ))}
          </div>

          <button
            className="continue-btn"
            onClick={() => navigate("/dashboard")}
          >
            Continue to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // ================= QUESTION VIEW =================
  const q = assessmentQuestions[current];

  return (
    <div className="assessment-page">
      <div className="assessment-card">
        <h2>🧠 Skill Assessment</h2>
        <p className="progress">
          Question {current + 1} / {assessmentQuestions.length}
        </p>

        <h3>{q.question}</h3>

        <div className="options">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`option-btn ${
                answers[current] === opt ? "selected" : ""
              }`}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="actions">
          {current < assessmentQuestions.length - 1 ? (
            <button
              disabled={!answers[current]}
              className="next-btn"
              onClick={handleNext}
            >
              Next →
            </button>
          ) : (
            <button
              disabled={!answers[current]}
              className="submit-btn"
              onClick={handleFinish}
            >
              Finish Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;
