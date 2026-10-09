import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(here, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const allowed = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.md']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.has(ext)) return cb(new Error('Allowed file types: PDF, DOC, DOCX, PPT, PPTX, TXT and MD.'));
  cb(null, true);
}
export const upload = multer({ storage, fileFilter, limits: { fileSize: (Number(process.env.MAX_FILE_MB) || 15) * 1024 * 1024 } });
