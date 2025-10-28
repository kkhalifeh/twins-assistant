import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Use require for multer-s3 to avoid TypeScript type errors
const multerS3 = require('multer-s3');

// Storage configuration
const USE_CLOUD_STORAGE = process.env.USE_CLOUD_STORAGE === 'true';
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT; // For Cloudflare R2 or other S3-compatible
const STORAGE_REGION = process.env.STORAGE_REGION || 'auto';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'twins-assistant';
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY;
const STORAGE_PUBLIC_URL = process.env.STORAGE_PUBLIC_URL; // Public URL for accessing files

// Initialize S3 client (works with AWS S3, Cloudflare R2, etc.)
const s3Client = USE_CLOUD_STORAGE && STORAGE_ACCESS_KEY && STORAGE_SECRET_KEY
  ? new S3Client({
      region: STORAGE_REGION,
      endpoint: STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
      },
    })
  : null;

// Local storage fallback
const localUploadsDir = path.join(__dirname, '../../uploads/diapers');
if (!USE_CLOUD_STORAGE && !fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Configure multer storage
let storage: multer.StorageEngine;

if (USE_CLOUD_STORAGE && s3Client) {
  // Cloud storage (S3/R2)
  storage = multerS3({
    s3: s3Client,
    bucket: STORAGE_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req: Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = `diapers/diaper-${uniqueSuffix}${ext}`;
      cb(null, filename);
    },
  });
} else {
  // Local storage fallback
  storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      cb(null, localUploadsDir);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `diaper-${uniqueSuffix}${ext}`);
    },
  });
}

// Create multer upload instance
export const uploadDiaperImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter,
});

// Helper to get file URL
export const getFileUrl = (filename: string | undefined): string | null => {
  if (!filename) return null;

  if (USE_CLOUD_STORAGE && STORAGE_PUBLIC_URL) {
    // Cloud storage URL
    return `${STORAGE_PUBLIC_URL}/${filename}`;
  } else {
    // Local storage URL
    return `/uploads/diapers/${filename}`;
  }
};

// Helper to delete uploaded file
export const deleteUploadedFile = async (fileKey: string): Promise<void> => {
  try {
    if (USE_CLOUD_STORAGE && s3Client) {
      // Delete from cloud storage
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: fileKey,
        })
      );
    } else {
      // Delete from local storage
      const filePath = path.join(localUploadsDir, path.basename(fileKey));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Helper to upload buffer directly (useful for image processing)
export const uploadBuffer = async (
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> => {
  if (USE_CLOUD_STORAGE && s3Client) {
    // Upload to cloud storage
    const key = `diapers/${filename}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      })
    );
    return key;
  } else {
    // Save to local storage
    const filePath = path.join(localUploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return filename;
  }
};

export const isCloudStorageEnabled = () => USE_CLOUD_STORAGE && s3Client !== null;
