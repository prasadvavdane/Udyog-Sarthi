import mongoose, { Schema } from 'mongoose';
import { Report } from '@/types';

const ReportSchema = new Schema<Report>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  type: {
    type: String,
    enum: ['sales', 'gst', 'inventory', 'profit', 'customer'],
    required: true
  },
  data: { type: Schema.Types.Mixed },
  generatedAt: { type: Date, default: Date.now },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
}, {
  timestamps: true,
});

// Indexes
ReportSchema.index({ tenantId: 1, type: 1 });
ReportSchema.index({ tenantId: 1, generatedAt: -1 });

export default mongoose.models.Report || mongoose.model<Report>('Report', ReportSchema);