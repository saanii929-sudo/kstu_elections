"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";
import OtpInput from "@/components/OtpInput";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP step state
  const [showOtp, setShowOtp] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    const tokenTimestamp = localStorage.getItem("tokenTimestamp");

    if (token && userData && tokenTimestamp) {
      try {
        const user = JSON.parse(userData);
        const timestamp = parseInt(tokenTimestamp);
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

        // Check if token is expired (older than 6 hours)
        if (now - timestamp > sixHours) {
          // Token expired, clear storage
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("tokenTimestamp");
          toast.error("Session expired. Please login again.");
        } else {
          // Token still valid, redirect to dashboard
          const redirectPath =
            user.eventType === "election"
              ? "/election-dashboard"
              : "/dashboard";
          router.push(redirectPath);
        }
      } catch (error) {
        // Invalid data, clear storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenTimestamp");
      }
    }
  }, [router]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const completeLogin = (data: { token: string; user: { eventType?: string; [key: string]: unknown } }) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("tokenTimestamp", Date.now().toString());

    const redirectPath =
      data.user.eventType === "election" ? "/election-dashboard" : "/dashboard";

    router.push(redirectPath);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Logging in...");

    try {
      // Try organization login first
      let response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          userType: "organization",
        }),
      });

      let data = await response.json();

      // If organization login fails, try org-admin login
      if (!response.ok) {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            userType: "org-admin",
          }),
        });
        data = await response.json();
      }

      // If org-admin login fails, try event-organizer login
      if (!response.ok) {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            userType: "event-organizer",
          }),
        });
        data = await response.json();
      }

      if (response.ok && data.success && data.requiresOtp) {
        toast.dismiss(loadingToast);
        setLoginId(data.loginId);
        setMaskedEmail(data.maskedEmail || "");
        setOtpDigits(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setShowOtp(true);
      } else if (response.ok && data.success) {
        toast.dismiss(loadingToast);
        completeLogin(data);
      } else {
        toast.error(
          data.error || "Login failed. Please check your credentials.",
          {
            id: loadingToast,
            duration: 4000,
          },
        );
      }
    } catch (err: any) {
      toast.error("Network error. Please try again.", {
        id: loadingToast,
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const otpValue = otpDigits.join("");

  const handleVerifyOtp = async () => {
    if (otpValue.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, otp: otpValue }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Verified!");
        completeLogin(data);
      } else {
        toast.error(data.error || "Invalid code");
        setOtpDigits(["", "", "", "", "", ""]);
      }
    } catch {
      toast.error("Failed to verify code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Verification code resent");
        setOtpDigits(["", "", "", "", "", ""]);
        setResendCooldown(60);
      } else {
        toast.error(data.error || "Failed to resend code");
      }
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#363636",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#16a34a",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#fff",
            },
          },
        }}
      />
      <motion.section
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="relative min-h-screen w-full"
      >
        {/* Background */}
        <Image
          src="/images/hero_image.jpeg"
          alt="KsTU E-Vote background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          {/* Login Card */}
          {!showOtp && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur"
            >
              {/* Logo */}
              <div className="flex-col mb-3 flex justify-center items-center">
                <Image
                  src="/images/logo.png"
                  alt="KsTU E-Vote"
                  width={100}
                  height={100}
                />
                <h1 className="font-bold text-[#1C2338] text-lg">Kumasi Technical University</h1>
                <h2 className="font-bold text-[#D4AF37] text-sm">Electronic Voting System</h2>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Email */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-green-600/20"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-11 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-green-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" className="rounded border-gray-300" />
                    Remember me
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-[#D4AF37] hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-white hover:bg-[#D4AF37] disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* OTP Verification Card */}
          {showOtp && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="bg-[#1c2338] px-8 pt-8 pb-6 text-center">
                <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="text-white" size={28} />
                </div>
                <h2 className="text-lg font-bold text-white">Verify Your Login</h2>
                <p className="text-sm text-gray-300 mt-1">Confirm your identity to continue</p>
              </div>

              <div className="px-8 py-6">
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
                  <p className="text-xs text-gray-500 mb-1">A 6-digit code was sent to</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {maskedEmail || "your registered email"}
                  </p>
                </div>

                <div className="mb-6">
                  <OtpInput digits={otpDigits} onChange={setOtpDigits} />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpValue.length < 6}
                  className="w-full py-3 bg-[#D4AF37] text-white rounded-xl font-semibold hover:bg-[#c19d2f] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
                >
                  {otpLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Confirm & Continue
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={handleResendOtp}
                    disabled={resendLoading || resendCooldown > 0}
                    className="text-[#D4AF37] font-medium hover:text-[#a3821f] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {resendLoading
                      ? "Sending…"
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend code"}
                  </button>
                  <button
                    onClick={() => setShowOtp(false)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    ← Back to Login
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.section>
    </>
  );
}
