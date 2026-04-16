import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'leave-attachments');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 接收上限 10 MB，壓縮後遠小於此
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只接受 JPEG、PNG、WebP 圖片或 PDF 檔案'));
    }
  },
});

/** Compress image and save to disk. Returns the stored filename. */
export async function saveAttachment(file: Express.Multer.File): Promise<string> {
  const id = crypto.randomUUID();

  if (file.mimetype === 'application/pdf') {
    const filename = `${id}.pdf`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
    return filename;
  }

  // 縮至最大 800×800，65% JPEG 品質，請假證明只需清楚可讀即可
  const filename = `${id}.jpg`;
  await sharp(file.buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 65 })
    .toFile(path.join(UPLOAD_DIR, filename));

  return filename;
}

export function resolveAttachmentPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}
