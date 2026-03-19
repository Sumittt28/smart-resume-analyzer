"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type HistoryItem = {
  id: string;
  fileName: string;
  createdAt: string;
  jobTitle: string | null;
  score: number | null;
  analysisId: string | null;
};

type UploadResponse = {
  resumeId: string;
  fileName: string;
  extractedText: string;
  error?: string;
};

type AnalyzeResponse = {
  analysisId?: string;
  score?: number;
  error?: string;
  reasons?: string[];
};

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadMessage, setUploadMessage] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisReasons, setAnalysisReasons] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobDescription, setJobDescription] = useState("");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshHistory() {
    const dashboardResponse = await fetch("/api/dashboard", { credentials: "include" });
    const dashboardData = await dashboardResponse.json();

    if (!dashboardResponse.ok) {
      throw new Error(dashboardData.error || "Could not load dashboard.");
    }

    setHistory(dashboardData.history || []);
    setError("");
  }

  useEffect(() => {
    async function loadDashboard() {
      try {
        const authResponse = await fetch("/api/auth/me", { credentials: "include" });
        if (!authResponse.ok) {
          router.replace("/login");
          return;
        }

        const userData = await authResponse.json();
        if (!userData.user) {
          router.replace("/login");
          return;
        }

        await refreshHistory();
      } catch {
        setError("Could not load dashboard data. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  const uploadFile = async (selectedFile: File) => {
    if (!selectedFile) {
      setUploadMessage("Please select a PDF file.");
      return;
    }

    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setUploadMessage("Only PDF files are allowed.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadMessage("File exceeds 10MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadMessage("Uploading and extracting text...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const data = await new Promise<UploadResponse>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/upload");
        request.withCredentials = true;

        request.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        request.onload = () => {
          try {
            const parsed = JSON.parse(request.responseText || "{}") as UploadResponse;
            if (request.status >= 200 && request.status < 300) {
              resolve(parsed);
              return;
            }
            reject(new Error(parsed.error || "Upload failed."));
          } catch {
            reject(new Error("Upload failed."));
          }
        };

        request.onerror = () => reject(new Error("Network error while uploading."));
        request.send(formData);
      });

      setUploadProgress(100);
      setUploadMessage(`Resume uploaded successfully: ${data.fileName}`);
      await refreshHistory();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
      setUploadMessage(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setUploadMessage("Please choose a PDF file.");
      return;
    }
    await uploadFile(selectedFile);
  };

  const handleAnalyze = async (event: React.FormEvent) => {
    event.preventDefault();
    setAnalysisReasons([]);

    if (!history.length) {
      setAnalysisMessage("Upload a resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setAnalysisMessage("Job description is required.");
      return;
    }

    setAnalyzing(true);
    setAnalysisMessage("Analyzing job fit...");

    try {
      const latestResumeId = history[0].id;
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: latestResumeId, jobDescription: jobDescription.trim() }),
      });

      const data = (await response.json()) as AnalyzeResponse;
      if (!response.ok) {
        setAnalysisReasons(Array.isArray(data.reasons) ? data.reasons : []);
        setAnalysisMessage(data.error || "Analysis failed.");
        return;
      }

      if (!data.analysisId) {
        setAnalysisMessage("Analysis completed, but no result page was created. Please retry.");
        return;
      }

      setAnalysisMessage(`Analysis complete. Match score: ${data.score ?? 0}%.`);
      router.push(`/result/${data.analysisId}`);
    } catch {
      setAnalysisMessage("Could not analyze the job description right now.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-slate-300">Upload your resume, compare it with a job description, and review ATS-style insights.</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
          >
            Logout
          </button>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.05fr,1.35fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Upload Resume</h2>
            <p className="mt-1 text-sm text-slate-300">PDF only, maximum 10MB. Text-based resumes work best for ATS extraction.</p>
            <div className="mt-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Choose Resume"}
              </button>
              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-cyan-200">Upload progress: {uploadProgress}%</p>
                </div>
              )}
              {uploadMessage && (
                <p className={`text-sm ${uploadMessage.toLowerCase().includes("success") ? "text-emerald-300" : "text-cyan-200"}`}>
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Analyze Job Description</h2>
            <p className="mt-1 text-sm text-slate-300">Paste the full JD. The latest uploaded resume will be used for analysis.</p>
            <form onSubmit={handleAnalyze} className="mt-4 space-y-3">
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={10}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-sm text-white outline-none transition focus:border-cyan-400"
                placeholder="Paste the full job description here..."
                required
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={analyzing || uploading}
                  className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {analyzing ? "Analyzing..." : "Analyze JD"}
                </button>
                <span className="text-xs text-slate-400">Analysis includes skills, semantic context, and experience alignment.</span>
              </div>
            </form>
            {analysisMessage && (
              <p className={`mt-3 text-sm ${analysisMessage.toLowerCase().includes("complete") ? "text-emerald-300" : "text-cyan-200"}`}>
                {analysisMessage}
              </p>
            )}
            {analysisReasons.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                <p className="font-medium">Why the job description was rejected</p>
                <ul className="mt-2 list-disc pl-4">
                  {analysisReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Analysis History</h2>
              <p className="text-sm text-slate-300">Your uploads and their latest ATS evaluation are stored here.</p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300">{history.length} resumes</span>
          </div>

          {loading ? (
            <p className="mt-4 text-slate-300">Loading history...</p>
          ) : error ? (
            <p className="mt-4 text-rose-300">{error}</p>
          ) : history.length === 0 ? (
            <p className="mt-4 text-slate-300">No resumes uploaded yet.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-600 bg-slate-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-white">{item.fileName}</p>
                      <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-slate-300">
                        {item.jobTitle ? `Latest role: ${item.jobTitle}` : "No job description analyzed yet."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-200">
                        Score: {item.score ?? "N/A"}
                      </span>
                      {item.analysisId && (
                        <Link
                          href={`/result/${item.analysisId}`}
                          className="rounded-lg border border-cyan-400/40 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/10"
                        >
                          View Result
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
