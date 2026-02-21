import cloudinary from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dn9ts84q6',
  api_key: process.env.CLOUDINARY_API_KEY || '797652563747974',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'raOkraliwEKlBFTRL7Cr9kEyHOA'
});

export default cloudinary;