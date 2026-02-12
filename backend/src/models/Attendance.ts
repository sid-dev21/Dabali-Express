import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  student_id: string;
  menu_id: string;
  date: Date;
  present: boolean;
  justified: boolean;
  reason?: string;
  marked_by: string;
  marked_at: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  menu_id: { type: Schema.Types.ObjectId, ref: 'Menu', required: true },
  date: { type: Date, required: true },
  present: { type: Boolean, required: true },
  justified: { type: Boolean, required: true, default: false },
  reason: String,
  marked_by: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Index for better performance
AttendanceSchema.index({ student_id: 1, date: -1 });
AttendanceSchema.index({ menu_id: 1 });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
