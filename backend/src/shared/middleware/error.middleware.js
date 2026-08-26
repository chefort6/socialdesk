const { errorResponse } = require("../utils/response.util");

exports.notFound = (req, res) => errorResponse(res, "Route not found", 404);

exports.handleError = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const statusCode = error.statusCode || error.status || 500;
  if (statusCode >= 500) {
    console.error("Unhandled request error:", error);
  }

  let message = error.publicMessage || error.message || "Request failed";
  if (error.type === "entity.too.large") message = "Request body too large";
  if (error.type === "entity.parse.failed") message = "Invalid JSON body";
  if (process.env.NODE_ENV === "production" && statusCode >= 500) {
    message = "Internal server error";
  }

  return errorResponse(res, message, statusCode);
};
