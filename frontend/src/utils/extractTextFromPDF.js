import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url
).toString();

export const extractTextFromPdf = async (file) => {
    try {
        if (!file) throw new Error("No file provided");
        if (file.type !== "application/pdf") throw new Error("File is not a PDF");

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            let pageText = content.items.map((item) => item.str).join(" ");

            // If no readable text, fallback to OCR
            if (!pageText.trim()) {
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d");

                await page.render({ canvasContext: ctx, viewport }).promise;

                const ocrResult = await Tesseract.recognize(canvas, "eng", {
                    logger: (m) => console.log(m), // Optional: logs OCR progress
                });

                pageText = ocrResult.data.text;
            }

            text += pageText + "\n";
        }

        if (!text.trim()) throw new Error("No readable text found in PDF");

        return text;
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw new Error("Error reading the PDF file");
    }
};
