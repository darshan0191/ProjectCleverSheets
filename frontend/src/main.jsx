import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GenerateQuizPage from './pages/GenerateQuizPage';
import QuizHistoryPage from "./pages/QuizHistoryPage";
import DashboardPage from "./pages/DashboardPage";
import AssessmentPage from "./pages/AssessmentPage";
import LearningPage from "./pages/LearningPage";
import KnowledgeBaseUploadPage from "./pages/KnowledgeBaseUploadPage";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/generate" element={<GenerateQuizPage />} />
        <Route path="/quiz-history" element={<QuizHistoryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/learn" element={<LearningPage />} />
        <Route path="/upload-knowledge" element={<KnowledgeBaseUploadPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
