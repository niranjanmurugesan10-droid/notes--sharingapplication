import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Note from '../models/Note.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
const router = Router();
const routeDir = path.dirname(fileURLToPath(import.meta.url));
const safeNote = n => n;
router.get('/', async (req, res, next) => {
  try {
    const filter = { status: 'published' };
    if (req.query.subject && req.query.subject !== 'All') filter.subject = req.query.subject;
    if (req.query.level && req.query.level !== 'All') filter.educationLevel = req.query.level;
    if (req.query.search) filter.$text = { $search: String(req.query.search).slice(0, 100) };
    let sort = { createdAt: -1 };
    if (req.query.sort === 'popular') sort = { downloads: -1, createdAt: -1 };
    if (req.query.sort === 'liked') sort = { likes: -1, createdAt: -1 };
    const notes = await Note.find(filter).populate('uploader', 'name').sort(sort).limit(100);
    res.json({ notes });
  } catch (e) { next(e); }
});
router.post('/', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please choose a notes file to upload.' });
    const { title, subject, description = '', educationLevel = 'Other', tags = '' } = req.body;
    if (!title?.trim() || !subject?.trim()) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: 'Title and subject are required.' });
    }
    const parsedTags = String(tags).split(',').map(t => t.trim()).filter(Boolean).slice(0, 10);
    const note = await Note.create({
      title: title.trim(), subject: subject.trim(), description, educationLevel, tags: parsedTags,
      originalName: path.basename(req.file.originalname).slice(0, 180), storedName: req.file.filename,
      mimeType: req.file.mimetype || 'application/octet-stream', size: req.file.size, uploader: req.user._id
    });
    await note.populate('uploader', 'name');
    res.status(201).json({ note: safeNote(note) });
  } catch (e) { if (req.file?.path) await fs.unlink(req.file.path).catch(() => {}); next(e); }
});
router.get('/mine', protect, async (req, res, next) => {
  try { const notes = await Note.find({ uploader: req.user._id }).sort({ createdAt: -1 }); res.json({ notes }); }
  catch (e) { next(e); }
});
router.get('/bookmarks', protect, async (req, res, next) => {
  try { const notes = await Note.find({ bookmarks: req.user._id, status: 'published' }).populate('uploader', 'name').sort({ createdAt: -1 }); res.json({ notes }); }
  catch (e) { next(e); }
});
router.post('/:id/bookmark', protect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid note ID.' });
    const note = await Note.findOne({ _id: req.params.id, status: 'published' });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    const idx = note.bookmarks.findIndex(id => String(id) === String(req.user._id));
    if (idx >= 0) note.bookmarks.splice(idx, 1); else note.bookmarks.push(req.user._id);
    await note.save();
    res.json({ bookmarked: idx < 0 });
  } catch (e) { next(e); }
});
router.post('/:id/like', protect, async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, status: 'published' });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    const idx = note.likes.findIndex(id => String(id) === String(req.user._id));
    if (idx >= 0) note.likes.splice(idx, 1); else note.likes.push(req.user._id);
    await note.save();
    res.json({ liked: idx < 0, likes: note.likes.length });
  } catch (e) { next(e); }
});
router.post('/:id/report', protect, async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, status: 'published' });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    if (String(note.uploader) === String(req.user._id)) return res.status(400).json({ message: 'You cannot report your own upload.' });
    if (note.reports.some(r => String(r.user) === String(req.user._id))) return res.status(409).json({ message: 'You already reported this note.' });
    note.reports.push({ user: req.user._id, reason: String(req.body.reason || 'Other').slice(0, 300) });
    if (note.reports.length >= 5) note.status = 'hidden';
    await note.save();
    res.json({ message: 'Report received. Thank you for helping keep the library useful.' });
  } catch (e) { next(e); }
});
router.get('/:id/download', async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, status: 'published' });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    const filePath = path.resolve(routeDir, '../../uploads', note.storedName);
    note.downloads += 1; await note.save();
    res.download(filePath, note.originalName, err => { if (err && !res.headersSent) next(err); });
  } catch (e) { next(e); }
});
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    if (String(note.uploader) !== String(req.user._id)) return res.status(403).json({ message: 'You can only delete your own notes.' });
    await Note.findByIdAndDelete(note._id);
    await fs.unlink(path.resolve(routeDir, '../../uploads', note.storedName)).catch(() => {});
    res.json({ message: 'Note deleted.' });
  } catch (e) { next(e); }
});
export default router;
