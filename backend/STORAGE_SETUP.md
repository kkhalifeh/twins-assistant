# Image Storage Configuration

The application supports both local filesystem storage (for development) and cloud storage (for production) for uploaded images.

## Local Storage (Default)

By default, images are stored in `backend/uploads/diapers/` and served via Express static middleware.

**No configuration needed** - works out of the box for development.

## Cloud Storage (Production)

For production deployments, we recommend using cloud storage to ensure images persist across deployments and are accessible from multiple server instances.

### Supported Providers

The storage service is S3-compatible and works with:
- **Cloudflare R2** (Recommended - no egress fees, generous free tier)
- **AWS S3**
- **DigitalOcean Spaces**
- **Backblaze B2**
- Any other S3-compatible storage

### Option 1: Cloudflare R2 (Recommended)

**Why R2?**
- Free tier: 10 GB storage, 1 million Class A operations/month
- **Zero egress fees** (unlike S3)
- S3-compatible API
- Global CDN included

**Setup Steps:**

1. Create a Cloudflare account and enable R2
2. Create a new R2 bucket (e.g., `twins-assistant`)
3. Generate API tokens:
   - Go to R2 → Manage R2 API Tokens
   - Create a new token with "Edit" permissions for your bucket
   - Save the Access Key ID and Secret Access Key
   ACCESS KEY: 449b04a73ec4749aebd58a2f1c377620
   SECRET ACCESS KEY: 2cfa074be6cd5e0894917a899428dedb6ae2c70d6f4b0b5506150ded55a6cc46
4. Get your account ID from the R2 dashboard URL:
   ```
   https://dash.cloudflare.com/<ACCOUNT_ID>/r2/overview
   ACCOUNT ID: https://dash.cloudflare.com/0f79926a05cebf0bc60347268d33e6c9/r2/overview
   ```
5. Configure public access (optional):
   - Go to your bucket settings
   - Enable "Public URL" or connect a custom domain
   - Copy the public URL
   PUBLIC URL: https://pub-36c9797cf36042708aa0f58ca6cb3979.r2.dev

**Environment Variables:**

```bash
USE_CLOUD_STORAGE=true
STORAGE_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
STORAGE_REGION="auto"
STORAGE_BUCKET="twins-assistant"
STORAGE_ACCESS_KEY="<YOUR_ACCESS_KEY_ID>"
STORAGE_SECRET_KEY="<YOUR_SECRET_ACCESS_KEY>"
STORAGE_PUBLIC_URL="https://<YOUR_PUBLIC_DOMAIN>"
```

### Option 2: AWS S3

**Setup Steps:**

1. Create an S3 bucket
2. Create an IAM user with S3 access
3. Generate access keys
4. Configure CORS if needed
5. Set up CloudFront CDN (recommended for better performance)

**Environment Variables:**

```bash
USE_CLOUD_STORAGE=true
# Leave STORAGE_ENDPOINT empty for AWS S3
STORAGE_ENDPOINT=""
STORAGE_REGION="us-east-1"  # Your AWS region
STORAGE_BUCKET="twins-assistant"
STORAGE_ACCESS_KEY="<YOUR_AWS_ACCESS_KEY>"
STORAGE_SECRET_KEY="<YOUR_AWS_SECRET_KEY>"
STORAGE_PUBLIC_URL="https://<YOUR_BUCKET>.s3.amazonaws.com"
# Or use CloudFront URL: "https://<CLOUDFRONT_ID>.cloudfront.net"
```

## Migration from Local to Cloud

If you already have images in local storage and want to migrate to cloud:

1. List all images in `backend/uploads/diapers/`
2. Upload them to your cloud bucket (use AWS CLI, Cloudflare dashboard, or a script)
3. Update the `imageUrl` values in the database:
   ```sql
   UPDATE "DiaperLog"
   SET "imageUrl" = REPLACE("imageUrl", '/uploads/diapers/', 'diapers/')
   WHERE "imageUrl" IS NOT NULL;
   ```
4. Enable cloud storage in your environment variables

## Troubleshooting

### Images not loading
- Check that `STORAGE_PUBLIC_URL` is correct and accessible
- Verify bucket permissions allow public read access
- Check browser console for CORS errors
- Verify the image URLs in the database match your storage configuration

### Upload failing
- Check AWS SDK credentials are correct
- Verify bucket permissions allow write access
- Check file size limits (5MB default)
- Look for errors in backend logs

### CORS issues
Configure CORS on your bucket to allow requests from your frontend domain:

**Cloudflare R2 CORS Example:**
```json
[
  {
    "AllowedOrigins": ["https://your-frontend-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Cost Estimates

### Cloudflare R2 (Recommended)
- Storage: $0.015/GB/month (after 10GB free)
- Class A Operations: $4.50 per million (after 1M free)
- **Egress: FREE**

### AWS S3
- Storage: ~$0.023/GB/month
- PUT requests: $0.005 per 1,000
- GET requests: $0.0004 per 1,000
- **Data transfer out: $0.09/GB** (expensive!)

For a typical parenting assistant app with ~1000 images:
- **R2: ~$0.15-0.50/month**
- **S3: ~$2-5/month** (plus egress costs)
