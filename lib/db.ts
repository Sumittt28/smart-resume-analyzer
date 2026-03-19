import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: MongoMemoryServer | null;
};

const globalWithMongoose = global as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached: MongooseCache =
  globalWithMongoose.mongoose ??
  (globalWithMongoose.mongoose = {
    conn: null,
    promise: null,
    memoryServer: null,
  });

export async function connectDb() {
  if (cached.conn) return cached.conn;

  const mongoUri = process.env.MONGODB_URI;
  if (!cached.promise) {
    if (mongoUri) {
      cached.promise = mongoose.connect(mongoUri).then((m) => m).catch(async (err) => {
        console.warn("MongoDB URI failed, falling back to in-memory Mongo:", err.message);
        if (cached.memoryServer) {
          await cached.memoryServer.stop();
        }
        cached.memoryServer = await MongoMemoryServer.create();
        const uri = cached.memoryServer.getUri();
        return mongoose.connect(uri).then((m) => m);
      });
    } else {
      cached.memoryServer = await MongoMemoryServer.create();
      const uri = cached.memoryServer.getUri();
      cached.promise = mongoose.connect(uri).then((m) => m);
    }
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
