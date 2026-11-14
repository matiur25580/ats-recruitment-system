import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// চেক করার জন্য লগ (পাসওয়ার্ড ছাড়া)
console.log("Cloudinary Config Check:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "পাওয়া গেছে ✅" : "পাওয়া যায়নি ❌",
  api_key: process.env.CLOUDINARY_API_KEY ? "পাওয়া গেছে ✅" : "পাওয়া যায়নি ❌",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "পাওয়া গেছে ✅" : "পাওয়া যায়নি ❌",
});

export default cloudinary;
