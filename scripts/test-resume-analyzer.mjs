import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadAnalyzer() {
  const sourcePath = path.resolve("lib", "resume-analyzer.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "resume-analyzer-"));
  const outputPath = path.join(tempDir, "resume-analyzer.cjs");
  fs.writeFileSync(outputPath, compiled.outputText, "utf8");

  try {
    return require(outputPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const { analyzeResume } = loadAnalyzer();

const resumeText = `
SUMIT KUMAR
Frontend Developer
Email: sumit@example.com | Phone: +91-9876543210 | Location: Bangalore, India

PROFESSIONAL SUMMARY
Frontend Developer with strong experience building responsive web applications using React.js, JavaScript, HTML5, CSS3, and REST APIs.

SKILLS
- HTML5, CSS3, JavaScript (ES6+)
- React.js, Redux, Angular
- Tailwind CSS, Bootstrap
- Git, GitHub, REST APIs, Axios, Fetch
- Responsive Design, Cross-Browser Compatibility

EXPERIENCE
Frontend Developer Intern
ABC Tech Solutions | Jan 2025 - Present
- Developed reusable UI components using React.js
- Integrated REST APIs and handled asynchronous data
- Improved performance and reduced load time by 20%
- Collaborated with designers for better UX

PROJECTS
Smart Resume Analyzer
- Built a full-stack application to analyze resumes against job descriptions
- Implemented keyword matching and scoring logic
- Designed responsive UI using React and Tailwind CSS
`;

function runCase(name, testFn) {
  try {
    testFn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

runCase("matches real skills and produces explainable scoring", () => {
  const analysis = analyzeResume(
    resumeText,
    "Frontend Developer role requiring React.js, HTML, CSS, JavaScript, REST APIs, accessibility, performance optimization, and 2+ years experience."
  );

  assert.deepEqual(analysis.matchedSkills, ["css", "html", "javascript", "react", "rest api"]);
  assert.ok(analysis.missingSkills.includes("accessibility"));
  assert.ok(analysis.missingSkills.includes("performance optimization"));
  assert.equal(analysis.scoreBreakdown.total, analysis.score);
  assert.equal(analysis.scoreBreakdown.explanation.length, 3);
  assert.equal(analysis.scoreBreakdown.details.skills.score, analysis.scoreBreakdown.skills);
  assert.ok(analysis.feedback.skills.length > 0);
  assert.ok(analysis.suggestions.length > 0);
  assert.ok(typeof analysis.confidenceScore === "number" && analysis.confidenceScore > 0);
  assert.ok(analysis.score >= 55 && analysis.score <= 90);
  assert.ok(analysis.scoreBreakdown.context >= 55);
});

runCase("ignores names and company words as skills", () => {
  const analysis = analyzeResume(resumeText, "html css sumit abc tech solutions");

  assert.deepEqual(analysis.matchedSkills, ["css", "html"]);
  assert.ok(!analysis.matchedSkills.includes("sumit"));
  assert.ok(!analysis.matchedSkills.includes("abc"));
  assert.ok(!analysis.matchedSkills.includes("tech"));
  assert.ok(analysis.score <= 100);
  assert.ok(!analysis.suggestions.some((item) => /sumit|email|phone/i.test(item)));
  assert.ok(!analysis.matchedKeywords.some((item) => /sumit|email|phone/i.test(item)));
});

runCase("throws for empty JD", () => {
  assert.throws(() => analyzeResume(resumeText, "   "), /Job description is required/);
});

runCase("rejects resume-like job descriptions", () => {
  assert.throws(
    () => analyzeResume(resumeText, "SUMIT KUMAR\nEmail: sumit@example.com\nEducation\nCertifications"),
    /Invalid Job Description detected/
  );
});

runCase("surfaces missing skills in suggestions", () => {
  const analysis = analyzeResume(
    resumeText,
    "Frontend Engineer with React, TypeScript, Docker, Kubernetes, AWS, and CI/CD experience."
  );

  assert.ok(analysis.missingSkills.includes("docker"));
  assert.ok(analysis.missingSkills.includes("kubernetes"));
  assert.ok(analysis.missingSkills.includes("aws"));
  assert.ok(analysis.suggestions.some((item) => item.toLowerCase().includes("docker")));
});

runCase("identical text keeps context score high", () => {
  const jdText = "Frontend Developer role requiring React.js, JavaScript, HTML, CSS, REST APIs, performance optimization, and responsive design.";
  const analysis = analyzeResume(jdText, jdText);
  assert.ok(analysis.scoreBreakdown.context >= 95);
});

runCase("keyword extraction stays human-readable", () => {
  const analysis = analyzeResume(
    resumeText,
    "Frontend Developer role requiring asynchronous handling, API integration, responsive design, and performance optimization."
  );

  assert.ok(analysis.matchedKeywords.includes("asynchronous handling"));
  assert.ok(analysis.matchedKeywords.includes("api integration"));
  assert.ok(!analysis.missingKeywords.some((item) => /\basynchronou\b|\baxio\b|\brequir\b/.test(item)));
  assert.ok(!analysis.matchedKeywords.some((item) => /\basynchronou\b|\baxio\b|\brequir\b/.test(item)));
});

runCase("recommended skills appear even when missing skills are limited", () => {
  const analysis = analyzeResume(
    resumeText,
    "Frontend Developer role requiring React.js, HTML, CSS, JavaScript, REST APIs, and Tailwind CSS."
  );

  assert.equal(analysis.missingSkills.length, 0);
  assert.ok(Array.isArray(analysis.recommendedSkills));
  assert.ok(analysis.recommendedSkills.length > 0);
});

runCase("internship experience is counted in years", () => {
  const internshipResume = `
PRIYA SHARMA
Software Developer Intern

EXPERIENCE
Software Developer Intern
Bright Apps | June 2025 - July 2025
- Built internal dashboards and fixed UI bugs
`;

  const analysis = analyzeResume(
    internshipResume,
    "Software Developer Intern role requiring HTML, CSS, and JavaScript."
  );

  assert.ok(analysis.extractedData.resumeYears >= 0.2, "Expected internship duration to count toward experience.");
  assert.ok(analysis.extractedData.resumeYears < 1, "Short internship should stay below one year.");
});

runCase("backend job descriptions produce backend-focused recommendations", () => {
  const analysis = analyzeResume(
    resumeText,
    "Backend Developer role requiring Java, SQL, REST APIs, and backend service development."
  );

  assert.ok(analysis.recommendedSkills.includes("Spring Boot"));
  assert.ok(analysis.recommendedSkills.includes("Hibernate / ORM"));
  assert.ok(analysis.recommendedSkills.includes("REST API design"));
  assert.ok(analysis.recommendedSkills.includes("Microservices"));
  assert.ok(!analysis.recommendedSkills.includes("TypeScript"));
  assert.ok(!analysis.recommendedSkills.includes("Jest"));
});

if (!process.exitCode) {
  console.log("Analyzer smoke tests passed.");
}
