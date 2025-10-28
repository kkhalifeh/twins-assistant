declare module 'multer-s3' {
  import { S3Client } from '@aws-sdk/client-s3';
  import { Request } from 'express';
  import { Multer, StorageEngine } from 'multer';

  namespace MulterS3 {
    interface Options {
      s3: S3Client;
      bucket: string | ((req: Request, file: Express.Multer.File, callback: (error: any, bucket?: string) => void) => void);
      key?: (req: Request, file: Express.Multer.File, callback: (error: any, key?: string) => void) => void;
      acl?: string;
      contentType?: ((req: Request, file: Express.Multer.File, callback: (error: any, mime?: string, stream?: any) => void) => void) | any;
      metadata?: (req: Request, file: Express.Multer.File, callback: (error: any, metadata?: any) => void) => void;
      cacheControl?: string;
      contentDisposition?: string;
      serverSideEncryption?: string;
      storageClass?: string;
    }

    const AUTO_CONTENT_TYPE: (req: Request, file: Express.Multer.File, callback: (error: any, mime?: string, stream?: any) => void) => void;
  }

  function MulterS3(options: MulterS3.Options): StorageEngine;

  export = MulterS3;
}
