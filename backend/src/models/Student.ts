import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  first_name: string;
  last_name: string;
  class_name?: string;
  school_id: mongoose.Types.ObjectId;
  parent_id: mongoose.Types.ObjectId;
  photo_url?: string;
  allergies?: string[];
  created_at: Date;
  updated_at: Date;
}

const StudentSchema = new Schema<IStudent>({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  class_name: String,
  school_id: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  photo_url: String,
  allergies: [String]
}, { timestamps: true });

export default mongoose.model<IStudent>('Student', StudentSchema);
