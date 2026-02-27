// backend/store/knowledgeStore.js

let knowledgeBase = [];

export const setKnowledgeBase = (chunks) => {
    knowledgeBase = chunks;
};

export const getKnowledgeBase = () => {
    return knowledgeBase;
};
