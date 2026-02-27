import express from "express";
import multer from "multer";
import fs from "fs";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
    saveKnowledge,
    loadKnowledge
} from "../services/knowledgeService.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const STORAGE_FILE = "knowledge.json";
const STRUCTURED_FILE = "structuredKnowledge.json";

/* =============================
   🔍 Generate Subtopics
============================= */
const generateSubtopics = (chunks) => {
    const subtopics = {};

    chunks.forEach(chunk => {
        // Extract potential headings (capitalized phrases)
        const words = chunk.split(" ");

        words.forEach(word => {
            if (
                word.length > 4 &&
                word[0] === word[0].toUpperCase()
            ) {
                if (!subtopics[word]) {
                    subtopics[word] = [];
                }

                subtopics[word].push(chunk);
            }
        });
    });

    return subtopics;
};

/* =============================
   📤 Upload & Extract Knowledge
============================= */
router.post("/upload-knowledge", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        const fileType = req.file.mimetype;

        let extractedText = "";

        console.log("📄 Processing file:", req.file.originalname);

        if (fileType === "application/pdf") {
            const fileBuffer = new Uint8Array(
                fs.readFileSync(filePath)
            );

            const pdf = await pdfjsLib
                .getDocument({ data: fileBuffer })
                .promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();

                const pageText = content.items
                    .map(item => item.str)
                    .join(" ");

                extractedText += pageText + "\n";
            }
        }

        else if (
            fileType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
            const result = await mammoth.extractRawText({ path: filePath });
            extractedText = result.value;
        }

        else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: "Unsupported file type" });
        }

        fs.unlinkSync(filePath);

        if (!extractedText.trim()) {
            extractedText = "No extractable text found.";
        }

        const chunks = extractedText.match(/.{1,800}/g) || [];

        // Save raw knowledge
        fs.writeFileSync(
            STORAGE_FILE,
            JSON.stringify(chunks, null, 2)
        );

        // 🔥 Generate structured subtopics
        const structured = generateSubtopics(chunks);

        fs.writeFileSync(
            STRUCTURED_FILE,
            JSON.stringify(structured, null, 2)
        );

        res.json({
            message: "✅ Knowledge extracted & structured",
            chunksStored: chunks.length,
            subtopicsGenerated: Object.keys(structured).length,
        });

    } catch (err) {
        console.error("❌ Upload Knowledge Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

/* =============================
   📚 Get Structured Knowledge
============================= */
router.get("/structured-knowledge", (req, res) => {
    try {
        if (!fs.existsSync(STRUCTURED_FILE)) {
            return res.json({});
        }

        const data = JSON.parse(
            fs.readFileSync(STRUCTURED_FILE, "utf-8")
        );

        res.json(data);

    } catch (err) {
        console.error("Structured fetch error:", err);
        res.status(500).json({ error: "Failed to load structured knowledge" });
    }
});

export default router;
