import { IncomingForm } from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_SIZE = 200 * 1024; // 200kB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  const form = new IncomingForm({ maxFileSize: MAX_SIZE, uploadDir: UPLOAD_DIR, keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const file = files.image;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const uploadedFile = Array.isArray(file) ? file[0] : file;
    if (!ACCEPTED_FORMATS.includes(uploadedFile.mimetype || '')) {
      return res.status(400).json({ error: 'Invalid file type. Accepted: jpg, jpeg, png, webp, gif.' });
    }
    if (uploadedFile.size > MAX_SIZE) {
      return res.status(400).json({ error: 'File too large. Max size is 200kB.' });
    }
    // The file is already saved in UPLOAD_DIR by formidable
    const fileName = path.basename(uploadedFile.filepath);
    return res.status(200).json({ filePath: `/uploads/${fileName}` });
  });
} 