const mediaService = require("./media.service");
const {
  MEDIA_NAMESPACE,
  MAX_MEDIA_BYTES,
  ALLOWED_PURPOSES,
} = mediaService;
const {
  successResponse,
  errorResponse,
} = require("../../shared/utils/response.util");

const isAllowedMime = (mimetype) =>
  typeof mimetype === "string" &&
  (mimetype.startsWith("image/") || mimetype.startsWith("video/"));

const startsWithBytes = (buffer, bytes, offset = 0) =>
  Buffer.isBuffer(buffer) &&
  buffer.length >= offset + bytes.length &&
  bytes.every((byte, index) => buffer[offset + index] === byte);

const asciiAt = (buffer, value, offset = 0) =>
  Buffer.isBuffer(buffer) &&
  buffer.length >= offset + value.length &&
  buffer.toString("ascii", offset, offset + value.length) === value;

/** Determine the broad media type from file signatures, not client MIME data. */
const detectedResourceType = (buffer) => {
  const image =
    startsWithBytes(buffer, [0xff, 0xd8, 0xff]) || // JPEG
    startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || // PNG
    asciiAt(buffer, "GIF87a") ||
    asciiAt(buffer, "GIF89a") ||
    (asciiAt(buffer, "RIFF") && asciiAt(buffer, "WEBP", 8)) ||
    startsWithBytes(buffer, [0x42, 0x4d]) || // BMP
    asciiAt(buffer, "II*\0") ||
    asciiAt(buffer, "MM\0*") || // TIFF
    (asciiAt(buffer, "ftyp", 4) && /^(avif|avis|heic|heix|hevc|hevx)$/.test(buffer.toString("ascii", 8, 12)));
  if (image) return "image";

  const video =
    startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]) || // WebM/Matroska
    asciiAt(buffer, "RIFF") && asciiAt(buffer, "AVI ", 8) ||
    startsWithBytes(buffer, [0x00, 0x00, 0x01, 0xba]) || // MPEG program stream
    startsWithBytes(buffer, [0x00, 0x00, 0x01, 0xb3]) ||
    asciiAt(buffer, "OggS") ||
    asciiAt(buffer, "ftyp", 4); // MP4/QuickTime family
  return video ? "video" : null;
};

/** Thrown for bad input; the controller maps `statusCode` to the response. */
class MediaValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MediaValidationError";
    this.statusCode = 400;
  }
}

const folderFor = (userId, purpose) =>
  `${MEDIA_NAMESPACE}/${userId}/${purpose}`;

/**
 * POST /api/media — authenticated generic upload (multipart field "file",
 * optional text field "purpose"). Reuses mediaService.uploadToCloudinary;
 * never calls Cloudinary directly.
 */
exports.uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      throw new MediaValidationError("A media file is required");
    }
    if (!isAllowedMime(file.mimetype)) {
      throw new MediaValidationError(
        "Unsupported media type. Only image and video files are allowed",
      );
    }
    const resourceType = detectedResourceType(file.buffer);
    const claimedResourceType = file.mimetype.startsWith("video/")
      ? "video"
      : "image";
    if (!resourceType || resourceType !== claimedResourceType) {
      throw new MediaValidationError(
        "File contents do not match a supported image or video format",
      );
    }
    if (file.size > MAX_MEDIA_BYTES) {
      throw new MediaValidationError("Media file must be 10 MB or smaller");
    }

    const purpose = req.body?.purpose || "general";
    if (!ALLOWED_PURPOSES.includes(purpose)) {
      throw new MediaValidationError(
        `Invalid purpose. Allowed: ${ALLOWED_PURPOSES.join(", ")}`,
      );
    }

    const userId = req.user.id;
    const result = await mediaService.uploadToCloudinary(file, {
      folder: folderFor(userId, purpose),
      resource_type: resourceType,
    });

    return successResponse(res, {
      url: result.secure_url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
    });
  } catch (error) {
    console.error("Failed to upload media:", error);
    return errorResponse(
      res,
      error.statusCode ? error.message : "Failed to upload media",
      error.statusCode || 500,
    );
  }
};

/**
 * DELETE /api/media — authenticated delete via
 * mediaService.destroyFromCloudinary. Accepts { publicId, resourceType? }
 * from the JSON body (or query). Ownership is enforced by prefix:
 * only `user_media/{callerId}/...` may be deleted, else 403.
 */
exports.deleteMedia = async (req, res) => {
  try {
    const rawId = req.body?.publicId ?? req.query?.publicId;
    if (typeof rawId !== "string" || !rawId.trim()) {
      return errorResponse(res, "publicId is required", 400);
    }
    const publicId = rawId.trim();

    const prefix = `${MEDIA_NAMESPACE}/${req.user.id}/`;
    if (publicId.includes("..") || !publicId.startsWith(prefix)) {
      return errorResponse(res, "You can only delete your own media", 403);
    }

    const rawType =
      req.body?.resourceType ??
      req.body?.resource_type ??
      req.query?.resourceType ??
      req.query?.resource_type ??
      "image";
    if (!["image", "video"].includes(rawType)) {
      return errorResponse(
        res,
        "Invalid resourceType. Allowed: image, video",
        400,
      );
    }

    const result = await mediaService.destroyFromCloudinary(publicId, {
      resource_type: rawType,
      invalidate: true,
    });

    return successResponse(res, {
      publicId,
      result: result?.result || "ok",
    });
  } catch (error) {
    console.error("Failed to delete media:", error);
    return errorResponse(
      res,
      error.statusCode ? error.message : "Failed to delete media",
      error.statusCode || 500,
    );
  }
};
