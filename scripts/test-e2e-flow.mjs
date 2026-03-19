import assert from "node:assert/strict";
import { jsPDF } from "jspdf";

const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

function logStep(message) {
  console.log(`STEP ${message}`);
}

function getCookieHeader(response) {
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.split(";")[0] || "";
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data };
}

async function ensureServerAvailable() {
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    return response.status < 500;
  } catch {
    return false;
  }
}

function buildResumePdf() {
  const doc = new jsPDF();
  const lines = [
    "ALEX JOHNSON",
    "Frontend Developer",
    "Email: alex.johnson@example.com | Phone: +91-9876543210 | Location: Bangalore, India",
    "",
    "SKILLS",
    "React.js, JavaScript, HTML5, CSS3, Tailwind CSS, REST APIs, Git",
    "",
    "EXPERIENCE",
    "Frontend Developer",
    "Acme Digital Solutions | Jan 2023 - Present",
    "- Built reusable React components and improved load time by 30%",
    "- Integrated REST APIs and collaborated with designers on responsive UI",
    "",
    "PROJECTS",
    "Resume Analyzer",
    "- Built a Next.js app with analysis scoring and keyword matching",
  ];

  let y = 15;
  for (const line of lines) {
    doc.text(line, 10, y);
    y += 8;
  }

  return Buffer.from(doc.output("arraybuffer"));
}

async function main() {
  const serverReady = await ensureServerAvailable();
  if (!serverReady) {
    throw new Error(`Local app is not reachable at ${baseUrl}. Start it with 'npm run dev' first.`);
  }

  const email = `e2e-${Date.now()}@example.com`;
  const password = "Password1!";

  logStep("register user");
  const register = await fetchJson(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(register.response.status, 201, `Register failed: ${JSON.stringify(register.data)}`);

  const cookie = getCookieHeader(register.response);
  assert.ok(cookie.startsWith("token="), "Auth cookie was not returned after registration.");

  logStep("check authenticated session");
  const me = await fetchJson(`${baseUrl}/api/auth/me`, {
    headers: { cookie },
  });
  assert.equal(me.response.status, 200, `Auth check failed: ${JSON.stringify(me.data)}`);
  assert.equal(me.data?.user?.email, email);

  logStep("upload generated PDF resume");
  const form = new FormData();
  form.append("file", new Blob([buildResumePdf()], { type: "application/pdf" }), "e2e-resume.pdf");
  const upload = await fetchJson(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  assert.equal(upload.response.status, 200, `Upload failed: ${JSON.stringify(upload.data)}`);
  assert.ok(upload.data?.resumeId, "Upload did not return a resumeId.");

  logStep("analyze against JD");
  const analyze = await fetchJson(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      resumeId: upload.data.resumeId,
      jobDescription:
        "Frontend Developer role requiring React.js, JavaScript, HTML, CSS, Tailwind CSS, REST APIs, accessibility, and 2+ years of experience.",
    }),
  });
  assert.equal(analyze.response.status, 200, `Analyze failed: ${JSON.stringify(analyze.data)}`);
  assert.ok(analyze.data?.analysisId, "Analyze did not return an analysisId.");
  assert.ok(Array.isArray(analyze.data?.matchedSkills), "Matched skills were not returned.");
  assert.ok(analyze.data.matchedSkills.includes("react"), "Expected React to be matched.");
  assert.ok(analyze.data.matchedSkills.includes("javascript"), "Expected JavaScript to be matched.");
  assert.ok(analyze.data.missingSkills.includes("accessibility"), "Expected accessibility to be missing.");
  assert.ok(Array.isArray(analyze.data.recommendedSkills), "Expected recommended skills to be returned.");
  assert.ok(typeof analyze.data.score === "number" && analyze.data.score > 0, "Expected a positive score.");
  assert.equal(analyze.data.scoreBreakdown?.total, analyze.data.score, "Score breakdown total does not match score.");
  assert.ok(typeof analyze.data.confidenceScore === "number", "Confidence score was not returned.");
  assert.match(analyze.data.jobTitle || "", /frontend developer/i, "Expected an inferred job title.");
  assert.ok(analyze.data.scoreBreakdown?.details?.context?.reasons?.[0]?.includes("TF-IDF"), "Expected explainable context reasoning.");

  logStep("fetch saved analysis detail");
  const detail = await fetchJson(`${baseUrl}/api/analysis/${analyze.data.analysisId}`, {
    headers: { cookie },
  });
  assert.equal(detail.response.status, 200, `Analysis detail failed: ${JSON.stringify(detail.data)}`);
  assert.equal(detail.data?.analysis?.score, analyze.data.score, "Saved analysis score does not match API response.");
  assert.ok(detail.data?.analysis?.feedback?.skills, "Expected saved section feedback.");
  assert.ok(detail.data?.analysis?.jdValidation?.isValid, "Expected saved JD validation metadata.");
  assert.ok(detail.data?.analysis?.scoreBreakdown?.details?.context?.reasons?.length, "Expected persisted score detail reasons.");

  logStep("fetch dashboard history");
  const dashboard = await fetchJson(`${baseUrl}/api/dashboard`, {
    headers: { cookie },
  });
  assert.equal(dashboard.response.status, 200, `Dashboard fetch failed: ${JSON.stringify(dashboard.data)}`);
  assert.ok(Array.isArray(dashboard.data?.history), "Dashboard history was not returned.");
  assert.ok(dashboard.data.history.length > 0, "Dashboard history should contain the uploaded resume.");
  assert.equal(dashboard.data.history[0]?.jobTitle, analyze.data.jobTitle, "Dashboard should expose the inferred job title.");

  logStep("extract role from noisy backend JD");
  const backendAnalyze = await fetchJson(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      resumeId: upload.data.resumeId,
      jobDescription:
        "Team-oriented and ready to work in a fast-paced environment.\nRequirements\nSoftware Developer Intern\nJava, SQL, REST APIs, and backend service development.",
    }),
  });
  assert.equal(backendAnalyze.response.status, 200, `Backend analyze failed: ${JSON.stringify(backendAnalyze.data)}`);
  assert.match(backendAnalyze.data?.jobTitle || "", /software developer intern/i, "Expected role extraction to prefer the true title.");
  assert.ok(backendAnalyze.data?.recommendedSkills?.includes("Spring Boot"), "Expected backend recommendations.");
  assert.ok(!backendAnalyze.data?.recommendedSkills?.includes("TypeScript"), "Frontend recommendations should not dominate backend JDs.");

  logStep("fallback role extraction stays domain-aware");
  const fallbackRoleAnalyze = await fetchJson(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      resumeId: upload.data.resumeId,
      jobDescription:
        "People who succeed here are team-oriented and ready to work across services.\nJava, Spring, SQL, and API development are required.",
    }),
  });
  assert.equal(fallbackRoleAnalyze.response.status, 200, `Fallback role analyze failed: ${JSON.stringify(fallbackRoleAnalyze.data)}`);
  assert.equal(fallbackRoleAnalyze.data?.jobTitle, "Backend Developer", "Expected deterministic backend fallback role.");

  logStep("reject invalid job description");
  const invalidAnalyze = await fetchJson(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      resumeId: upload.data.resumeId,
      jobDescription: "Alex Johnson\nEmail: alex@example.com\nPhone: +91-9999999999\nEducation\nCertifications",
    }),
  });
  assert.equal(invalidAnalyze.response.status, 400, "Resume-like JD should be rejected.");
  assert.match(invalidAnalyze.data?.error || "", /invalid job description/i, "Expected invalid JD message.");

  console.log("E2E smoke test passed.");
}

main().catch((error) => {
  console.error("E2E smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
