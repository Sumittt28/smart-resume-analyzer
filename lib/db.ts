import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: {
    stop: () => Promise<boolean>;
    getUri: () => string;
  } | null;
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

async function createMemoryServer() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  return MongoMemoryServer.create();
}

export async function connectDb() {
  if (cached.conn) return cached.conn;

  const mongoUri = process.env.MONGODB_URI?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!cached.promise) {
    cached.promise = (async () => {
      if (mongoUri) {
        try {
          return await mongoose.connect(mongoUri);
        } catch (err) {
          if (isProduction) {
            throw new Error(`Failed to connect to MongoDB using MONGODB_URI: ${(err as Error).message}`);
          }

          console.warn("MongoDB URI failed, falling back to in-memory Mongo:", (err as Error).message);
          if (cached.memoryServer) {
            await cached.memoryServer.stop();
          }
          cached.memoryServer = await createMemoryServer();
          return mongoose.connect(cached.memoryServer.getUri());
        }
      }

      if (isProduction) {
        throw new Error("Missing MONGODB_URI environment variable in production.");
      }

      cached.memoryServer = await createMemoryServer();
      return mongoose.connect(cached.memoryServer.getUri());
    })().catch((err) => {
      cached.promise = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
