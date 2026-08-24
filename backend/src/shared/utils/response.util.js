/**
 * Standardized success response format.
 *
 * @param {object} res - Express response object
 * @param {object} data - Payload data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
exports.successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

/**
 * Standardized error response format.
 *
 * @param {object} res - Express response object
 * @param {string} message - High-level error summary
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {object|array} details - Additional error details (e.g., validation fields)
 */
exports.errorResponse = (res, message, statusCode = 400, details = null) => {
  const safeMessage =
    process.env.NODE_ENV === "production" && statusCode >= 500
      ? "Internal server error"
      : message;
  const response = {
    success: false,
    error: safeMessage,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};
