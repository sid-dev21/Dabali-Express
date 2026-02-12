// Importing necessary modules from mongoose
import mongoose, { Document, Schema } from 'mongoose';

// Defining the IUser interface that extends Document to represent a user in the database
interface IUser extends Document {
  email: string;
  password: string;
  role: string;
  first_name: string;
  last_name: string;
  phone?: string;
  school_id?: mongoose.Types.ObjectId;
  is_temporary_password?: boolean;
  password_changed_at?: Date;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

// Defining the UserSchema using the IUser interface
const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'] },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  phone: String,
  school_id: { type: Schema.Types.ObjectId, ref: 'School' },
  is_temporary_password: { type: Boolean, default: false },
  password_changed_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }); // Adding timestamps to automatically manage created_at and updated_at fields

// Exporting the User model based on the UserSchema

export default mongoose.model<IUser>('User', UserSchema);