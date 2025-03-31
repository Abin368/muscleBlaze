const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadToCloudinary = async (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
        });
        stream.end(fileBuffer);
    });
};

module.exports = { cloudinary, uploadToCloudinary };
