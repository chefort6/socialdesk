"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Eye, EyeOff, User, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
	const router = useRouter();

	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const [showForgotModal, setShowForgotModal] = useState(false);
	const [forgotEmail, setForgotEmail] = useState("");
	const [forgotSubmitted, setForgotSubmitted] = useState(false);
	
	// Focus states for floating labels
	const [emailFocused, setEmailFocused] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);
	const [forgotEmailFocused, setForgotEmailFocused] = useState(false);

	// Error states
	const [emailError, setEmailError] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [forgotEmailError, setForgotEmailError] = useState("");

	const handleLogin = async (e: React.SubmitEvent) => {
		e.preventDefault();
		
		// Reset errors
		setEmailError("");
		setPasswordError("");

		// Validate email
		if (!email.trim()) {
			setEmailError("Email address is required");
			return;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			setEmailError("Please enter a valid email address");
			return;
		}

		// Validate password
		if (!password.trim()) {
			setPasswordError("Password is required");
			return;
		}

		try {
			const response = await fetch("/api/auth/login", {
				method: 'POST',
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					password,
					rememberMe,
				}),
			});

			const json = await response.json();
			const data = json.data || json; // Handle { success, data } envelope

			if (!response.ok) {
				setEmailError("An error occured logging in.");
				return;
			}

			const expires = rememberMe ? 7 : 1;
			const cookieOptions = {
				expires,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax" as const,
			};
			Cookies.set("auth-token", data.token, cookieOptions);
			Cookies.set("user-role", data.role, cookieOptions);
			if (data.user?.id) {
				Cookies.set("user-id", data.user.id.toString(), cookieOptions);
			}

			router.push("/dashboard");
		} catch (error) {
			setEmailError("Server error occured.")
		}

	};

	const handleForgotSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		setForgotEmailError("");

		if (!forgotEmail.trim()) {
			setForgotEmailError("Email address is required");
			return;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(forgotEmail)) {
			setForgotEmailError("Please enter a valid email address");
			return;
		}

		setForgotSubmitted(true);
	};

	return (
		<div className="min-h-screen bg-[#D6E8F5] flex flex-col lg:flex-row lg:items-start pt-10 md:pt-16 lg:pt-24 px-4 md:px-8 lg:px-6 relative overflow-x-hidden">

			{/* Grid background */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					backgroundImage: `
						linear-gradient(rgba(39,76,119,0.07) 1px, transparent 1px),
						linear-gradient(90deg, rgba(39,76,119,0.07) 1px, transparent 1px)
					`,
					backgroundSize: "96px 96px",
				}}
			/>

			{/* Top-left gradient blob */}
			<div
				className="absolute pointer-events-none"
				style={{
					top: "-10%",
					left: "-8%",
					width: "55%",
					height: "55%",
					background: "radial-gradient(ellipse at top left, rgba(39,76,119,0.18) 0%, rgba(96,150,186,0.10) 40%, transparent 70%)",
				}}
			/>

			{/* Bottom-right gradient blob */}
			<div
				className="absolute pointer-events-none"
				style={{
					bottom: "-10%",
					right: "-8%",
					width: "55%",
					height: "55%",
					background: "radial-gradient(ellipse at bottom right, rgba(39,76,119,0.18) 0%, rgba(163,206,241,0.12) 40%, transparent 70%)",
				}}
			/>

			<div className="relative flex flex-col lg:flex-row w-full lg:items-start lg:pl-15 lg:pr-8">

				{/* Branding — stacks above card on mobile, side-by-side on desktop */}
				<div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:flex-1 pt-8 md:pt-16 lg:pt-60 mb-10 lg:mb-0">
					<h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold leading-none whitespace-normal md:whitespace-nowrap">
						<span className="text-[#00BFFF]">Social</span>
						<span className="text-[#1B2F5B]">Desk</span>
					</h1>
					<p className="mt-4 md:mt-8 lg:mt-6 text-gray-600 text-sm md:text-xl lg:text-lg leading-snug max-w-xs md:max-w-xl lg:max-w-md line-clamp-2 md:line-clamp-none">
						Create, schedule, and track performance all in one platform that simplifies your workflow.
					</p>
				</div>

				{/* Login Card */}
				<div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto lg:mx-0 bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 flex flex-col lg:mt-40 lg:mr-40 mb-10 lg:mb-0">
					<h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B2F5B] mb-1">Welcome</h2>
					<p className="text-sm text-gray-500 mb-6">Sign in to continue to your account.</p>

					<form onSubmit={handleLogin} className="flex flex-col gap-5">

						{/* Email - Floating Label */}
						<div className="mt-3">
							<div className="relative">
								<div className={`flex items-center gap-3 rounded-lg px-4 py-3.5 border-2 transition-all ${
									emailError
										? "border-red-500 bg-red-50"
										: emailFocused
										? "border-[#1B2F5B] bg-white"
										: email
										? "border-gray-300 bg-white"
										: "border-transparent bg-gray-100 hover:bg-gray-200"
								}`}>
									<User size={18} className={`shrink-0 transition-colors ${emailError ? "text-red-500" : emailFocused ? "text-[#1B2F5B]" : "text-gray-400"}`} />
									<input
										type="text"
										value={email}
										onChange={(e) => {
											setEmail(e.target.value);
											if (emailError) setEmailError("");
										}}
										onFocus={() => setEmailFocused(true)}
										onBlur={() => setEmailFocused(false)}
										className="w-full bg-transparent text-sm text-gray-700 focus:outline-none leading-tight"
										placeholder=" "
									/>
								</div>
								<label
									className={`absolute transition-all duration-200 pointer-events-none ${
										emailFocused || email
											? "text-xs top-0 -translate-y-1/2 left-3 px-1 bg-white font-medium"
											: "text-sm top-1/2 -translate-y-1/2 left-11 text-gray-400"
									} ${ emailError ? "text-red-500" : emailFocused ? "text-[#1B2F5B]" : "text-gray-500" }`}
								>
									Email Address
								</label>
							</div>
							{emailError && (
								<div className="flex items-center gap-2 mt-2 text-red-500 text-xs font-medium">
									<AlertCircle size={14} />
									{emailError}
								</div>
							)}
						</div>

						{/* Password - Floating Label */}
						<div className="mt-3">
							<div className="relative">
								<div className={`flex items-center gap-3 rounded-lg px-4 py-3.5 border-2 transition-all ${
									passwordError
										? "border-red-500 bg-red-50"
										: passwordFocused
										? "border-[#1B2F5B] bg-white"
										: password
										? "border-gray-300 bg-white"
										: "border-transparent bg-gray-100 hover:bg-gray-200"
								}`}>
									<Lock size={18} className={`shrink-0 transition-colors ${passwordError ? "text-red-500" : passwordFocused ? "text-[#1B2F5B]" : "text-gray-400"}`} />
									<input
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(e) => {
											setPassword(e.target.value);
											if (passwordError) setPasswordError("");
										}}
										onFocus={() => setPasswordFocused(true)}
										onBlur={() => setPasswordFocused(false)}
										className="w-full bg-transparent text-sm text-gray-700 focus:outline-none leading-tight"
										placeholder=" "
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
									>
										{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
								<label
									className={`absolute transition-all duration-200 pointer-events-none ${
										passwordFocused || password
											? "text-xs top-0 -translate-y-1/2 left-3 px-1 bg-white font-medium"
											: "text-sm top-1/2 -translate-y-1/2 left-11 text-gray-400"
									} ${ passwordError ? "text-red-500" : passwordFocused ? "text-[#1B2F5B]" : "text-gray-500" }`}
								>
									Password
								</label>
							</div>
							{passwordError && (
								<div className="flex items-center gap-2 mt-2 text-red-500 text-xs font-medium">
									<AlertCircle size={14} />
									{passwordError}
								</div>
							)}
						</div>

						{/* Remember me */}
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={rememberMe}
								onChange={(e) => setRememberMe(e.target.checked)}
								className="w-4 h-4 rounded border-gray-300 accent-[#1B2F5B] cursor-pointer"
							/>
							<span className="text-sm text-[#1B2F5B] font-medium">Remember me</span>
						</label>

						{/* Sign In */}
						<button
							type="submit"
							className="w-full bg-[#1B2F5B] text-white py-3.5 rounded-lg font-semibold hover:bg-[#162548] transition-colors mt-1 cursor-pointer"
						>
							Sign In
						</button>

					</form>

					{/* Forgot Password */}
					<div className="mt-5 text-center">
						<button
							type="button"
							onClick={() => setShowForgotModal(true)}
							className="text-sm text-[#1B2F5B] underline hover:opacity-75 transition-opacity cursor-pointer"
						>
							Forgot Password?
						</button>
					</div>
				</div>
			</div>

			{/* Forgot Password Modal */}
			{showForgotModal && (
				<div
					className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
					onClick={() => { setShowForgotModal(false); setForgotSubmitted(false); setForgotEmail(""); }}
				>
					<div
						className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4 relative"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							onClick={() => { setShowForgotModal(false); setForgotSubmitted(false); setForgotEmail(""); }}
							className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-lg leading-none cursor-pointer"
						>
							✕
						</button>
						<h3 className="text-xl font-bold text-[#1B2F5B] text-center mb-6">Forgot Password</h3>

						{forgotSubmitted ? (
							<div className="flex flex-col items-center gap-4 py-4 text-center">
								<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
									<svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
										<polyline points="20 6 9 17 4 12" />
									</svg>
								</div>
								<p className="text-sm font-semibold text-gray-800">Request received</p>
								<p className="text-sm text-gray-500">Please contact your administrator to reset the password for <span className="font-medium text-gray-700">{forgotEmail}</span>.</p>
								<button
									type="button"
									onClick={() => { setShowForgotModal(false); setForgotSubmitted(false); setForgotEmail(""); }}
									className="mt-2 w-full bg-[#1B2F5B] text-white py-3 rounded-lg font-semibold hover:bg-[#162548] transition-colors cursor-pointer"
								>
									Done
								</button>
							</div>
						) : (
							<form onSubmit={handleForgotSubmit} className="flex flex-col gap-5">
								<div className="mt-3">
									<div className="relative">
										<div className={`flex items-center gap-3 rounded-lg px-4 py-3.5 border-2 transition-all ${
											forgotEmailError
												? "border-red-500 bg-red-50"
												: forgotEmailFocused
												? "border-[#1B2F5B] bg-white"
												: forgotEmail
												? "border-gray-300 bg-white"
												: "border-transparent bg-gray-100 hover:bg-gray-200"
										}`}>
											<Mail size={18} className={`shrink-0 transition-colors ${forgotEmailError ? "text-red-500" : forgotEmailFocused ? "text-[#1B2F5B]" : "text-gray-400"}`} />
											<input
												type="text"
												value={forgotEmail}
												onChange={(e) => {
													setForgotEmail(e.target.value);
													if (forgotEmailError) setForgotEmailError("");
												}}
												onFocus={() => setForgotEmailFocused(true)}
												onBlur={() => setForgotEmailFocused(false)}
												className="w-full bg-transparent text-sm text-gray-700 focus:outline-none leading-tight"
												placeholder=" "
											/>
										</div>
										<label
											className={`absolute transition-all duration-200 pointer-events-none ${
												forgotEmailFocused || forgotEmail
													? "text-xs top-0 -translate-y-1/2 left-3 px-1 bg-white font-medium"
													: "text-sm top-1/2 -translate-y-1/2 left-11 text-gray-400"
											} ${ forgotEmailError ? "text-red-500" : forgotEmailFocused ? "text-[#1B2F5B]" : "text-gray-500" }`}
										>
											Email Address
										</label>
									</div>
									{forgotEmailError && (
										<div className="flex items-center gap-2 mt-2 text-red-500 text-xs font-medium">
											<AlertCircle size={14} />
											{forgotEmailError}
										</div>
									)}
								</div>
								<button
									type="submit"
									className="w-full bg-[#1B2F5B] text-white py-3.5 rounded-lg font-semibold hover:bg-[#162548] transition-colors cursor-pointer"
								>
									Submit
								</button>
							</form>
						)}
					</div>
				</div>
			)}

		</div>
	);
}
