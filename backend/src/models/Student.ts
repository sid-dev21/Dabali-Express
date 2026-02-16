import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  first_name: string;
  last_name: string;
  class_name?: string;
  student_code?: string;
  birth_date?: Date;
  school_id: mongoose.Types.ObjectId;
  parent_id?: mongoose.Types.ObjectId;
  photo_url?: string;
  allergies?: string[];
  claimed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const StudentSchema = new Schema<IStudent>({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  class_name: String,
  student_code: { type: String, trim: true },
  birth_date: { type: Date },
  school_id: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'User' },
  photo_url: String,
  allergies: [String],
  claimed_at: { type: Date }
}, { timestamps: true });

StudentSchema.index({ school_id: 1, student_code: 1 }, { unique: true, sparse: true });
StudentSchema.index({ school_id: 1, last_name: 1, first_name: 1, birth_date: 1, class_name: 1 });

export default mongoose.model<IStudent>('Student', StudentSchema);
