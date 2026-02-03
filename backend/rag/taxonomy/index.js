import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads taxonomy JSON safely
 * @param {string} subject - java | python | react | c
 */
export function loadTaxonomy(subject) {
    const filePath = path.join(__dirname, `${subject}.taxonomy.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`❌ Taxonomy file not found: ${filePath}`);
    }

    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
