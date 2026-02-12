import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'MEAL_TAKEN' | 'MEAL_MISSED' | 'MENU_APPROVED' | 'MENU_REJECTED' | 'ABSENCE';
  related_student_id?: mongoose.Types.ObjectId;
  related_menu_id?: mongoose.Types.ObjectId;
  read: boolean;
  created_at: Date;
  // Additional fields from API joins
  student_first_name?: string;
  student_last_name?: string;
  menu_description?: string;
  meal_type?: string;
}

const NotificationSchema = new Schema<INotification>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true, enum: ['MEAL_TAKEN', 'MEAL_MISSED', 'MENU_APPROVED', 'MENU_REJECTED', 'ABSENCE'] },
  related_student_id: { type: Schema.Types.ObjectId, ref: 'Student' },
  related_menu_id: { type: Schema.Types.ObjectId, ref: 'Menu' },
  read: { type: Boolean, required: true, default: false }
}, { timestamps: true });

export default mongoose.model<INotification>('Notification', NotificationSchema);
