import mongoose, { Schema, model, models } from "mongoose";

export interface IResume {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  extractedText: string;
  createdAt: Date;
}

const ResumeSchema = new Schema<IResume>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fileName: { type: String, required: true },
  extractedText: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

export default models.Resume || model<IResume>("Resume", ResumeSchema);
