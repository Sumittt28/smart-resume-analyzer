import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-xl">
        <h1 className="text-3xl font-bold">Smart Resume Analyzer</h1>
        <p className="mt-3 text-slate-300">Upload your resume, compare with job descriptions, and get actionable suggestions.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link className="rounded-lg bg-cyan-500 px-4 py-2 text-slate-900 font-semibold hover:bg-cyan-400" href="/register">Get Started</Link>
          <Link className="rounded-lg border border-slate-400 px-4 py-2 text-white hover:bg-slate-700/50" href="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
