import mongoose from 'mongoose';
const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 1200 },
  educationLevel: { type: String, default: 'Other', enum: ['School', 'Diploma', 'Undergraduate', 'Postgraduate', 'Other'] },
  tags: [{ type: String, trim: true, maxlength: 30 }],
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  downloads: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reports: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: { type: String, maxlength: 300 } }],
  status: { type: String, enum: ['published', 'hidden'], default: 'published' }
}, { timestamps: true });
noteSchema.index({ title: 'text', subject: 'text', description: 'text', tags: 'text' });
export default mongoose.model('Note', noteSchema);
