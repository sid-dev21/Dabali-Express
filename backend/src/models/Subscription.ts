import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  student_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  meal_plan: 'STANDARD' | 'PREMIUM' | 'VEGETARIAN';
  price: number;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  status: { type: String, required: true, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
  meal_plan: { type: String, required: true, enum: ['STANDARD', 'PREMIUM', 'VEGETARIAN'], default: 'STANDARD' },
  price: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
