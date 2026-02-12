
import mongoose from 'mongoose';


// Connect to MongoDB
export const connectDB = async () => {
  // Use the MONGODB_URI environment variable 
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dabali-express');
    console.log('MongoDB connected:', conn.connection.host);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};