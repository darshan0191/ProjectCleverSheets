import React, { useState } from 'react';
import './styles.css';
import { generateQuizFromNotes } from './utils/generateQuizFromNotes';
import { extractTextFromPDF } from './utils/extractTextFromPDF';
import QuizHistoryPage from "./pages/QuizHistoryPage";


function App() {
  const [notesFile, setNotesFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [quiz, setQuiz] = useState([]);
  const [quizGenerated, setQuizGenerated] = useState(false);

  const handleFileChange = (e) => {
    setNotesFile(e.target.files[0]);
    setQuizGenerated(false);
    setQuiz([]);
  };

  const handleGenerateQuiz = async () => {
    if (!notesFile) {
      alert('Please upload your notes first!');
      return;
    }

    const fileType = notesFile.type;

    let text = '';
    try {
      if (fileType === 'application/pdf') {
        // PDF file → extract text using pdf.js
        text = await extractTextFromPDF(notesFile);
      } else {
        // Regular text file → read as plain text
        const reader = new FileReader();
        text = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsText(notesFile);
        });
      }

      const generatedQuiz = generateQuizFromNotes(text, numQuestions);
      setQuiz(generatedQuiz);
      setQuizGenerated(true);
    } catch (err) {
      console.error('Error reading file:', err);
      alert('Error reading file! Please upload a valid text or PDF file.');
    }
  };

  return (
    <div className="container">
      <h1 className="title">Notes to Quiz Converter</h1>

      <div className="input-group">
        <input type="file" onChange={handleFileChange} className="file-input" />
      </div>

      <div className="input-group">
        <label>
          Number of Questions:
          <input
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            min="1"
            max="50"
            className="number-input"
          />
        </label>
      </div>

      <button onClick={handleGenerateQuiz} className="generate-btn">
        Generate Quiz
      </button>

      {quizGenerated && (
        <div className="quiz-container">
          <h2>Generated Quiz:</h2>
          <ol>
            {quiz.map((q, index) => (
              <li key={index}>
                <strong>Q:</strong> {q.question} <br />
                <strong>Answer:</strong> {q.answer}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;
