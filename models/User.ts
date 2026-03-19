import { Schema, model, models } from "mongoose";

export interface IUser {
  email: string;
  password: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

export default models.User || model<IUser>("User", UserSchema);
