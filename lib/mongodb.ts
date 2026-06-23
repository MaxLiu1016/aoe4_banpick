import { MongoClient } from "mongodb";

// Separate raw MongoClient promise — used by the Auth.js MongoDB adapter.
// (Mongoose connection lives in lib/mongoose.ts for app models.)

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  throw new Error("Missing MONGODB_URI (or MONGO_URL) environment variable.");
}

const globalForMongo = globalThis as unknown as { _mongoClientPromise?: Promise<MongoClient> };

const clientPromise: Promise<MongoClient> =
  globalForMongo._mongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = clientPromise;
}

export default clientPromise;
