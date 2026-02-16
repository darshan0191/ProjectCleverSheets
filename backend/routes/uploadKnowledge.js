import express from "express";
import multer from "multer";
import fs from "fs";
import mammoth from "mammoth";

// ✅ Use legacy Node build
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload-knowledge", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        const fileType = req.file.mimetype;

        let extractedText = "";

        // ================= PDF =================
        if (fileType === "application/pdf") {

            const fileBuffer = fs.readFileSync(filePath);

            const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();

                const pageText = content.items
                    .map(item => item.str)
                    .join(" ");

                extractedText += pageText + "\n";
            }
        }

        // ================= DOCX =================
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

        // cleanup temp file
        fs.unlinkSync(filePath);

        res.json({
            message: "Knowledge extracted successfully",
            preview: extractedText.substring(0, 1000),
        });

    } catch (err) {
        console.error("❌ Upload Knowledge Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

export default router;
