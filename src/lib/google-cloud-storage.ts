import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_CLOUD_STORAGE_KEY_FILE, // Optional: for local development
});

const bucketName = process.env.STORAGE_BUCKET || 'your-storage-bucket-name';
const bucket = storage.bucket(bucketName);

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export class CloudStorageService {
  /**
   * Upload a file to Google Cloud Storage
   */
  static async uploadFile(
    file: Buffer | string,
    filename: string,
    contentType: string = 'image/jpeg'
  ): Promise<UploadResult> {
    try {
      const blob = bucket.file(filename);
      
      await blob.save(file, {
        metadata: {
          contentType,
          cacheControl: 'public, max-age=31536000', // 1 year cache
        },
        public: true,
      });

      const url = `https://storage.googleapis.com/${bucketName}/${filename}`;
      
      return {
        url,
        filename,
        size: file.length,
      };
    } catch (error) {
      console.error('Error uploading file to Cloud Storage:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string; contentType?: string }>
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile(file.buffer, file.filename, file.contentType)
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Google Cloud Storage
   */
  static async deleteFile(filename: string): Promise<void> {
    try {
      const blob = bucket.file(filename);
      await blob.delete();
    } catch (error) {
      console.error('Error deleting file from Cloud Storage:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Generate a signed URL for temporary access
   */
  static async generateSignedUrl(
    filename: string,
    expirationMinutes: number = 60
  ): Promise<string> {
    try {
      const blob = bucket.file(filename);
      const [url] = await blob.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });
      
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filename: string): Promise<boolean> {
    try {
      const blob = bucket.file(filename);
      const [exists] = await blob.exists();
      return exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(filename: string) {
    try {
      const blob = bucket.file(filename);
      const [metadata] = await blob.getMetadata();
      return metadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }
}

export default CloudStorageService;
