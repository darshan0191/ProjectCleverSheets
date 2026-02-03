import { ChromaClient } from "chromadb";

const chroma = new ChromaClient({
  host: "localhost",
  port: 8000,
});

const collections = await chroma.listCollections();
console.log("📦 Collections in Chroma:");
collections.forEach(c => console.log(" -", c.name));
