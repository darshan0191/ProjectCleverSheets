import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RetrievalPage = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const navigate = useNavigate();

    const handleSearch = async () => {
        const res = await fetch(
            "http://localhost:5000/api/retrieve-knowledge",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            }
        );

        const data = await res.json();
        setResults(data.results || []);
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "900px", margin: "auto" }}>
            <h2>📚 Retrieve From Uploaded Knowledge</h2>

            <div style={{ marginTop: "1rem" }}>
                <input
                    type="text"
                    placeholder="Search concept..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        padding: "10px",
                        width: "70%",
                        borderRadius: "8px",
                        marginRight: "10px",
                    }}
                />

                <button
                    onClick={handleSearch}
                    style={{
                        padding: "10px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                    }}
                >
                    Search
                </button>
            </div>

            <div style={{ marginTop: "2rem" }}>
                {results.map((r, i) => (
                    <div
                        key={i}
                        style={{
                            padding: "15px",
                            marginBottom: "12px",
                            background: "#1f2937",
                            borderRadius: "10px",
                            color: "white",
                        }}
                    >
                        {r}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RetrievalPage;
