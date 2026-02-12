import mongoose, { Document, Schema } from 'mongoose';

export interface ISchool extends Document {
  name: string;
  address?: string;
  city?: string;
  admin_id?: mongoose.Types.ObjectId;
}

const SchoolSchema = new Schema<ISchool>({
  name: { type: String, required: true },
  address: String,
  city: String,
  admin_id: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model<ISchool>('School', SchoolSchema);