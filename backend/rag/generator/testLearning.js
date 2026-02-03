import { generateLearningContent } from "./learningGenerator.js";

(async () => {
    const result = await generateLearningContent("Inheritance");
    console.log(JSON.stringify(result, null, 2));
})();
