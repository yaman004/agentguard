import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  await mongoose.connection.syncIndexes(); // build declared indexes
  console.log('MongoDB connected');
}
