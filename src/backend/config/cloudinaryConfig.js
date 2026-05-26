// src/backend/config/cloudinaryConfig.js
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: 'https://sfo3.digitaloceanspaces.com',
  region: 'sfo3',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY || 'DO00UZC3YL273BA9YPY8',
    secretAccessKey: process.env.SPACES_SECRET_KEY || '9cBjpTP3HrtIbhh92SE9pEqrywAsdS03ko3aFLeaq+8',
  },
  forcePathStyle: false,
});

const SPACES_CONFIG = {
  bucket: 'gestacks',
  endpoint: 'https://sfo3.digitaloceanspaces.com',
  cdnUrl: 'https://gestacks.sfo3.digitaloceanspaces.com',
};

export { s3Client, SPACES_CONFIG };