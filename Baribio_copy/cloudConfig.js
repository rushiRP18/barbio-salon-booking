//file to connect cloud with the backend
//such that cloudinary can be accessed by backend

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary')


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY
});

//folder to store data on the cloud
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "barbio_DEV",
        allowedFormats: ["png", "jpg", "jpeg"],
    }
})

module.exports = {
    cloudinary,
    storage
}