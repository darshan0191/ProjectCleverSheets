export async function getAdaptiveLearning(subject, quizHistory) {
  const response = await fetch("http://localhost:5000/api/adaptive-learning", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      quizHistory,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch adaptive learning content");
  }

  return response.json();
}
