const authService = require("./auth.service");
const { successResponse, errorResponse } = require("../../shared/utils/response.util");

exports.login = async (req, res) => {
	const { email, password } = req.body;

	try {
		const loginResult = await authService.login({ email, password });

		if (!loginResult) {
			return errorResponse(res, "Invalid email or password", 401);
		}

		return successResponse(res, loginResult);
	} catch (error) {
		console.error("Login error:", error);
		return errorResponse(res, "Internal server error", 500);
	}
};

exports.logout = (req, res) => {
	// JWTs are stateless and hold no server-side session, so there is nothing
	// to invalidate here. This exists to give clients a single endpoint to call
	// on sign-out, and to clear the auth cookies if they are ever set httpOnly
	// by the server instead of the frontend.
	const cookieOptions = {
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	};
	res.clearCookie("auth-token", cookieOptions);
	res.clearCookie("user-role", cookieOptions);
	res.clearCookie("user-id", cookieOptions);
	return successResponse(res, { message: "Logged out successfully" });
};
