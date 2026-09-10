const express = require("express");
const multer = require("multer");
const router = express.Router();
const mediaController = require("./media.controller");
const mediaService = require("./media.service");
const { errorResponse } = require("../../shared/utils/response.util");
const { authenticate } = require("../../shared/middleware/auth.middleware");

// `file` accepts images + short video clips (composer/thumbnail/avatar reuse).
// fileFilter rejects obviously unsupported client MIME labels early. The
// controller separately verifies the buffered file signature before upload.
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mediaService.MAX_MEDIA_BYTES },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype &&
      (file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/"))
    ) {
      return cb(null, true);
    }
    cb(new Error("Only image and video files are allowed"));
  },
});

/** Translates multer's errors into our JSON 400 envelope (users.routes pattern). */
const parseMediaUpload = (req, res, next) => {
  mediaUpload.single("file")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Media file must be 10 MB or smaller"
          : err.message || "Invalid media upload";
      return errorResponse(res, message, 400);
    }
    next();
  });
};

router.post("/", authenticate, parseMediaUpload, mediaController.uploadMedia);
router.delete("/", authenticate, mediaController.deleteMedia);

module.exports = router;
