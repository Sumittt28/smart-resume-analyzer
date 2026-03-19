"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jsPDF } from "jspdf";

type AnalysisDetail = {
  _id: string;
  score: number;
  jobTitle?: string;
  jobDescription: string;
  matchedSkills: string[];
  missingSkills: string[];
  recommendedSkills?: string[];
  suggestions: string[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  scoreBreakdown?: {
    skills: number;
    context: number;
    experience: number;
    total: number;
    explanation: string[];
    details?: {
      skills: { score: number; reasons: string[] };
      context: { score: number; reasons: string[] };
      experience: { score: number; reasons: string[] };
    };
  };
  feedback?: {
    skills: string;
    experience: string;
    formatting: string;
  };
  confidenceScore?: number;
  skillCategories?: {
    matched: Record<string, string[]>;
    missing: Record<string, string[]>;
  };
  extractedData?: {
    resumeSkills: string[];
    jdSkills: string[];
    resumeKeywords: string[];
    jdKeywords: string[];
    resumeYears: number;
    requiredYears: number | null;
    structuredResume?: {
      skills: string[];
      experience: string[];
      education: string[];
      projects: string[];
      certifications: string[];
    };
  };
  createdAt: string;
};

export default function ResultPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/analysis/${id}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Could not load result.");
          setLoading(false);
          return;
        }
        setAnalysis({ ...data.analysis, createdAt: data.analysis.createdAt });
      } catch (err) {
        console.error("RESULT_LOAD_ERROR", err);
        setError("Could not load result. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleDownload = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    let y = 20;
    const writeWrapped = (label: string, value: string) => {
      const wrapped = doc.splitTextToSize(`${label}${value}`, 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 6 + 2;
    };

    doc.setFontSize(20);
    doc.text("Smart Resume Analyzer Report", 14, y);
    y += 10;
    doc.setFontSize(12);
    writeWrapped("Role: ", analysis.jobTitle || "Untitled role");
    writeWrapped("Match Score: ", `${analysis.score}%`);
    if (typeof analysis.confidenceScore === "number") {
      writeWrapped("Confidence: ", `${analysis.confidenceScore}%`);
    }
    if (analysis.scoreBreakdown) {
      writeWrapped("Skills Score: ", `${analysis.scoreBreakdown.skills}%`);
      writeWrapped("Context Score: ", `${analysis.scoreBreakdown.context}%`);
      writeWrapped("Experience Score: ", `${analysis.scoreBreakdown.experience}%`);
      if (analysis.scoreBreakdown.details) {
        analysis.scoreBreakdown.details.skills.reasons.forEach((reason, index) => writeWrapped(`Skills Reason ${index + 1}: `, reason));
        analysis.scoreBreakdown.details.context.reasons.forEach((reason, index) => writeWrapped(`Context Reason ${index + 1}: `, reason));
        analysis.scoreBreakdown.details.experience.reasons.forEach((reason, index) => writeWrapped(`Experience Reason ${index + 1}: `, reason));
      }
    }
    writeWrapped("Matched Skills: ", analysis.matchedSkills.join(", ") || "None");
    writeWrapped("Missing Skills: ", analysis.missingSkills.join(", ") || "None");
    writeWrapped("Recommended Skills: ", analysis.recommendedSkills?.join(", ") || "None");
    writeWrapped("Matched Keywords: ", analysis.matchedKeywords?.join(", ") || "None");
    writeWrapped("Missing Keywords: ", analysis.missingKeywords?.join(", ") || "None");
    analysis.suggestions.forEach((suggestion, index) => {
      writeWrapped(`Suggestion ${index + 1}: `, suggestion);
    });
    doc.save(`analysis-${analysis._id}.pdf`);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white p-4">Loading...</div>;
  }
  if (error || !analysis) {
    return <div className="min-h-screen bg-slate-950 text-white p-4">Error: {error || "No result."}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Resume Analysis Result</h1>
            {analysis.jobTitle && <p className="mt-1 text-cyan-300">{analysis.jobTitle}</p>}
            <p className="text-slate-300">Created at {new Date(analysis.createdAt).toLocaleString()}</p>
          </div>
          <button onClick={() => router.replace('/dashboard')} className="rounded-lg border border-slate-500 px-3 py-2 text-sm">Back to dashboard</button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-2 text-white">
            <span className="rounded-full bg-emerald-500 px-2 py-1 text-xs font-semibold">Score {analysis.score}%</span>
            {typeof analysis.confidenceScore === "number" && <span className="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold">Confidence {analysis.confidenceScore}%</span>}
            <button onClick={handleDownload} className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-900">Download Report</button>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="font-semibold">Job Description</h3>
              <p className="text-slate-300 whitespace-pre-wrap">{analysis.jobDescription}</p>
            </div>
            <div>
              <h3 className="font-semibold">Matched Skills</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {analysis.matchedSkills.length > 0 ? analysis.matchedSkills.map((skill) => <span key={skill} className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs">{skill}</span>) : <span className="text-slate-300">No matched skills</span>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Missing Skills</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {analysis.missingSkills.length > 0 ? analysis.missingSkills.map((skill) => <span key={skill} className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs">{skill}</span>) : <span className="text-slate-300">No missing skills</span>}
              </div>
            </div>
            {analysis.recommendedSkills && analysis.recommendedSkills.length > 0 && (
              <div>
                <h3 className="font-semibold">Recommended Skills</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  {analysis.recommendedSkills.map((skill) => <span key={skill} className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs">{skill}</span>)}
                </div>
              </div>
            )}
            {analysis.scoreBreakdown && (
              <div>
                <h3 className="font-semibold">Score Breakdown</h3>
                <p className="mt-1 text-sm text-slate-400">Each score includes a short explanation so the match is not a black box.</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Skills Match</p>
                    <p className="mt-1 text-xl font-semibold">{analysis.scoreBreakdown.skills}%</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Context Relevance</p>
                    <p className="mt-1 text-xl font-semibold">{analysis.scoreBreakdown.context}%</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Experience Alignment</p>
                    <p className="mt-1 text-xl font-semibold">{analysis.scoreBreakdown.experience}%</p>
                  </div>
                </div>
                <ul className="mt-3 list-disc pl-4 text-slate-300">
                  {analysis.scoreBreakdown.explanation.map((item) => <li key={item}>{item}</li>)}
                </ul>
                {analysis.scoreBreakdown.details && (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
                      <p className="font-semibold text-white">Skills Reasons</p>
                      <ul className="mt-2 list-disc pl-4">
                        {analysis.scoreBreakdown.details.skills.reasons.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
                      <p className="font-semibold text-white">Context Reasons</p>
                      <ul className="mt-2 list-disc pl-4">
                        {analysis.scoreBreakdown.details.context.reasons.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
                      <p className="font-semibold text-white">Experience Reasons</p>
                      <ul className="mt-2 list-disc pl-4">
                        {analysis.scoreBreakdown.details.experience.reasons.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
            {analysis.matchedKeywords && analysis.matchedKeywords.length > 0 && (
              <div>
                <h3 className="font-semibold">Matched Context Keywords</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  {analysis.matchedKeywords.map((keyword) => <span key={keyword} className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-200">{keyword}</span>)}
                </div>
              </div>
            )}
            {analysis.missingKeywords && analysis.missingKeywords.length > 0 && (
              <div>
                <h3 className="font-semibold">Missing Context Keywords</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((keyword) => <span key={keyword} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">{keyword}</span>)}
                </div>
              </div>
            )}
            {analysis.feedback && (
              <div>
                <h3 className="font-semibold">Section Feedback</h3>
                <div className="mt-2 space-y-2 text-slate-300">
                  <p><span className="font-medium text-white">Skills:</span> {analysis.feedback.skills}</p>
                  <p><span className="font-medium text-white">Experience:</span> {analysis.feedback.experience}</p>
                  <p><span className="font-medium text-white">Formatting:</span> {analysis.feedback.formatting}</p>
                </div>
              </div>
            )}
            {analysis.skillCategories && (
              <div>
                <h3 className="font-semibold">Skill Categories</h3>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {Object.entries(analysis.skillCategories.matched)
                    .filter(([, skills]) => skills.length > 0)
                    .map(([category, skills]) => (
                      <div key={`matched-${category}`} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <p className="text-sm font-medium text-white">Matched {category}</p>
                        <p className="mt-2 text-sm text-slate-300">{skills.join(", ")}</p>
                      </div>
                    ))}
                  {Object.entries(analysis.skillCategories.missing)
                    .filter(([, skills]) => skills.length > 0)
                    .map(([category, skills]) => (
                      <div key={`missing-${category}`} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <p className="text-sm font-medium text-white">Missing {category}</p>
                        <p className="mt-2 text-sm text-slate-300">{skills.join(", ")}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold">Suggestions</h3>
              {analysis.suggestions.length > 0 ? (
                <ul className="list-disc pl-4 text-slate-200">
                  {analysis.suggestions.map((s) => <li key={s}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-slate-300">No additional suggestions. Your resume already aligns closely with this role.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
