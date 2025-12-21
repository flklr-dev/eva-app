import { v2 as cloudinary } from 'cloudinary';

// Validate configuration and configure Cloudinary
const validateConfig = () => {
  console.log('[Cloudinary] Validating configuration...');
  console.log('[Cloudinary] CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? `✓ Set (${process.env.CLOUDINARY_CLOUD_NAME})` : '✗ Missing');
  console.log('[Cloudinary] CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? `✓ Set (${process.env.CLOUDINARY_API_KEY?.substring(0, 8)}...)` : '✗ Missing');
  console.log('[Cloudinary] CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? `✓ Set (${process.env.CLOUDINARY_API_SECRET?.substring(0, 8)}...)` : '✗ Missing');

  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('[Cloudinary] Missing configuration:', missing);
    throw new Error(`Missing Cloudinary configuration: ${missing.join(', ')}`);
  }

  // Configure Cloudinary only after validation
  console.log('[Cloudinary] Configuring Cloudinary...');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log('[Cloudinary] ✓ Configuration validated and applied successfully');
};

// Export configured cloudinary instance and validator
export { cloudinary, validateConfig };
