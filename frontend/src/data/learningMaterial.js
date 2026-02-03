export const learningMaterial = {
    "Java Basics": {
        explanation: `
Java is a high-level, object-oriented, platform-independent programming language.

Key features:
• Write Once, Run Anywhere (WORA)
• Uses JVM to execute bytecode
• Strong memory management
        `,
        quizPool: [
            {
                question: "Java is a ___ language.",
                options: ["Low-level", "Assembly", "High-level", "Machine"],
                correct: "High-level",
            },
            {
                question: "Which component makes Java platform independent?",
                options: ["JDK", "JRE", "JVM", "Compiler"],
                correct: "JVM",
            },
            {
                question: "Java source code is compiled into?",
                options: ["Machine code", "Bytecode", "Assembly", "Binary"],
                correct: "Bytecode",
            },
            {
                question: "Which file extension is used for Java bytecode?",
                options: [".java", ".class", ".exe", ".jar"],
                correct: ".class",
            },
        ],
    },

    "OOP Concepts": {
        explanation: `
Object-Oriented Programming in Java is based on four principles:
Encapsulation, Inheritance, Polymorphism, Abstraction
        `,
        quizPool: [
            {
                question: "Which OOP concept supports code reuse?",
                options: [
                    "Encapsulation",
                    "Inheritance",
                    "Polymorphism",
                    "Abstraction",
                ],
                correct: "Inheritance",
            },
            {
                question: "Which keyword is used for inheritance?",
                options: ["this", "super", "extends", "implements"],
                correct: "extends",
            },
            {
                question: "Which concept hides implementation details?",
                options: [
                    "Encapsulation",
                    "Inheritance",
                    "Abstraction",
                    "Polymorphism",
                ],
                correct: "Abstraction",
            },
            {
                question: "Method overriding is an example of?",
                options: [
                    "Encapsulation",
                    "Inheritance",
                    "Polymorphism",
                    "Abstraction",
                ],
                correct: "Polymorphism",
            },
        ],
    },
};
