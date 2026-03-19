import mongoose, { Schema, model, models } from "mongoose";

export interface IAnalysis {
  userId: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  jobDescription: string;
  jobTitle?: string;
  score: number;
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
      skills: {
        score: number;
        reasons: string[];
      };
      context: {
        score: number;
        reasons: string[];
      };
      experience: {
        score: number;
        reasons: string[];
      };
    };
  };
  feedback?: {
    skills: string;
    experience: string;
    formatting: string;
  };
  confidenceScore?: number;
  jdValidation?: {
    isValid: boolean;
    warning: string | null;
    reasons: string[];
  };
  skillCategories?: {
    resume: Record<string, string[]>;
    jobDescription: Record<string, string[]>;
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
    structuredJobDescription?: {
      skills: string[];
      experience: string[];
      education: string[];
      projects: string[];
      certifications: string[];
    };
  };
  createdAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
  jobDescription: { type: String, required: true },
  jobTitle: { type: String },
  score: { type: Number, required: true },
  matchedSkills: [{ type: String }],
  missingSkills: [{ type: String }],
  recommendedSkills: [{ type: String }],
  suggestions: [{ type: String }],
  matchedKeywords: [{ type: String }],
  missingKeywords: [{ type: String }],
  scoreBreakdown: {
    skills: { type: Number },
    context: { type: Number },
    experience: { type: Number },
    total: { type: Number },
    explanation: [{ type: String }],
    details: { type: Schema.Types.Mixed },
  },
  feedback: {
    skills: { type: String },
    experience: { type: String },
    formatting: { type: String },
  },
  confidenceScore: { type: Number },
  jdValidation: { type: Schema.Types.Mixed },
  skillCategories: { type: Schema.Types.Mixed },
  extractedData: {
    resumeSkills: [{ type: String }],
    jdSkills: [{ type: String }],
    resumeKeywords: [{ type: String }],
    jdKeywords: [{ type: String }],
    resumeYears: { type: Number },
    requiredYears: { type: Number, default: null },
    structuredResume: { type: Schema.Types.Mixed },
    structuredJobDescription: { type: Schema.Types.Mixed },
  },
  createdAt: { type: Date, default: () => new Date() },
});

if (models.Analysis) {
  models.Analysis.schema.add(AnalysisSchema.obj);
}

export default (models.Analysis as mongoose.Model<IAnalysis>) || model<IAnalysis>("Analysis", AnalysisSchema);
