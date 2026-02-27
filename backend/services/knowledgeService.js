import fs from "fs";

const STORAGE_FILE = "knowledge.json";

export const saveKnowledge = (chunks) => {
    fs.writeFileSync(
        STORAGE_FILE,
        JSON.stringify(chunks, null, 2)
    );
};

export const loadKnowledge = () => {
    if (!fs.existsSync(STORAGE_FILE)) {
        return [];
    }

    return JSON.parse(
        fs.readFileSync(STORAGE_FILE, "utf-8")
    );
};
