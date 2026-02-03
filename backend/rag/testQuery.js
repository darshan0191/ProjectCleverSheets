import { queryVectorDB } from "./queryVectorDB.js";

console.log("🟢 testQuery.js started");

const runTest = async () => {
    console.log("🟡 Calling queryVectorDB...");
    const results = await queryVectorDB("Explain Java polymorphism");
    console.log("🟢 Retrieved Context:");
    console.log(results);
};

runTest()
    .then(() => console.log("✅ testQuery.js finished"))
    .catch(err => console.error("❌ Error:", err));
