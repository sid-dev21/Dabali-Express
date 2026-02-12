import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  subscription_id: mongoose.Types.ObjectId;
  parent_id: mongoose.Types.ObjectId;
  amount: number;
  method: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  reference?: string;
  paid_at?: Date;
  created_at: Date;
}

const PaymentSchema = new Schema<IPayment>({
  subscription_id: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true, enum: ['CREDIT_CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH'] },
  status: { type: String, required: true, enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'], default: 'PENDING' },
  reference: String,
  paid_at: Date
}, { timestamps: true });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
