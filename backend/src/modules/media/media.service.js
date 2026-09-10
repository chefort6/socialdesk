const cloudinary = require("./cloudinary.client");

/**
 * Generic reusable media uploads live under a backend-controlled namespace so
 * clients can never supply arbitrary Cloudinary folder paths:
 *
 *   user_media/{userId}/{purpose}/...
 */
const MEDIA_NAMESPACE = "user_media";

// Conservative cap: multer uses memoryStorage(), so the whole file sits in RAM.
// 10 MB covers images + short composer clips without risking OOM. Raise only
// after moving to disk/streaming uploads.
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

// `purpose` is the only client-influenced folder segment, strictly whitelisted.
const ALLOWED_PURPOSES = ["general", "composer", "thumbnail", "avatar"];

exports.MEDIA_NAMESPACE = MEDIA_NAMESPACE;
exports.MAX_MEDIA_BYTES = MAX_MEDIA_BYTES;
exports.ALLOWED_PURPOSES = ALLOWED_PURPOSES;

exports.uploadToCloudinary = (file, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);

      resolve(result);
    });

    stream.end(file.buffer);
  });
};

/**
 * Destroys a Cloudinary asset by its public id. Returns the raw Cloudinary
 * response, whose `result` is "ok" on success or "not found" when the asset does
 * not exist (destroying a missing asset is not treated as an error here).
 */
exports.destroyFromCloudinary = (publicId, options) => {
  return cloudinary.uploader.destroy(publicId, options);
};
