import { Router } from 'express';
import multer from 'multer';
import { analyzeImages, bulkSaveLogs, createSingleLog } from '../controllers/log-import.controller';

const router = Router();

// Configure multer for log import images
// Use memory storage since we need to send images to OpenAI API
const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

const uploadLogImages = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 5, // Maximum 5 files
  },
  fileFilter,
});

// Analyze uploaded images with AI
router.post('/analyze', uploadLogImages.array('images', 5), analyzeImages);

// Bulk save parsed logs
router.post('/bulk-save', bulkSaveLogs);

// Create single log (used during review/edit process)
router.post('/create-log', createSingleLog);

export default router;
