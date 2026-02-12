import mongoose, { Document, Schema } from 'mongoose';

export interface IMenu extends Document {
  school_id: mongoose.Types.ObjectId;
  date: Date;
  meal_type: string;
  description?: string;
  items?: string[];
  allergens?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_by: mongoose.Types.ObjectId;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
  // Additional fields from API joins
  school_name?: string;
  creator_first_name?: string;
  creator_last_name?: string;
}

const MenuSchema = new Schema<IMenu>({
  school_id: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, required: true },
  meal_type: { type: String, required: true, enum: ['BREAKFAST', 'LUNCH', 'DINNER'] },
  description: String,
  items: [String],
  allergens: [String],
  status: { type: String, required: true, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: Date,
  rejection_reason: String
}, { timestamps: true });

export default mongoose.model<IMenu>('Menu', MenuSchema);
