import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGO_URI;

  if (!MONGODB_URI) {
    console.error('[DB] MONGO_URI is not defined in environment variables');
    throw new Error('Please define the MONGO_URI environment variable inside .env.local');
  }

  // Warn if URI has quotes (common .env mistake)
  if (MONGODB_URI.startsWith('"') || MONGODB_URI.startsWith("'")) {
    console.error('[DB] WARNING: MONGO_URI contains quotes — remove them from .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
