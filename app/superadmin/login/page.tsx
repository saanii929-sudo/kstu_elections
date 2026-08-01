"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import { Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";
import OtpInput from "@/components/OtpInput";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP step state
  const [showOtp, setShowOtp] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [maskedContact, setMaskedContact] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "sms">("email");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const tokenTimestamp = localStorage.getItem('tokenTimestamp');

    if (token && userData && tokenTimestamp) {
      try {
        const user = JSON.parse(userData);
        const timestamp = parseInt(tokenTimestamp);
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000;

        if (now - timestamp > sixHours) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenTimestamp');
          toast.error('Session expired. Please login again.');
        } else if (user.role === 'superadmin') {
          router.push('/superadmin');
        } else if (user.role === 'electionAdmin') {
          router.push('/election-dashboard');
        }
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenTimestamp');
      }
    }
  }, [router]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const completeLogin = (data: { token: string; user: Record<string, unknown>; deviceToken?: string }) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("tokenTimestamp", Date.now().toString());
    // Deliberately NOT cleared on logout — this is what lets a "remembered"
    // browser skip OTP on its next login within the 7-day window.
    if (data.deviceToken) {
      localStorage.setItem("adminDeviceToken", data.deviceToken);
    }

    const role = data.user.role;
    if (role === "superadmin") {
      router.push("/superadmin");
    } else if (role === "electionAdmin") {
      router.push("/election-dashboard");
    } else {
      toast.error("No dashboard is available for this account yet.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("tokenTimestamp");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const loginData = {
      email: email.trim(),
      password: password,
      // "admin" covers every Admin-model role (superadmin, electionAdmin,
      // etc.) — the backend derives the actual role from the DB record, not
      // from this label; completeLogin() below routes by the real role.
      userType: "admin",
      // If this browser verified OTP within the last 7 days, the server
      // skips OTP entirely and logs in directly.
      deviceToken: localStorage.getItem("adminDeviceToken") || undefined,
    };

    const loadingToast = toast.loading("Logging in...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok && data.success && data.requiresOtp) {
        toast.dismiss(loadingToast);
        setLoginId(data.loginId);
        setMaskedContact(data.maskedContact || data.maskedEmail || "");
        setDeliveryMethod(data.deliveryMethod === "sms" ? "sms" : "email");
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

      <div className="relative min-h-screen w-full">
        {/* Background */}
        <Image
          src="/images/hero_image.jpeg"
          alt="KsTU-Evote background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          {!showOtp && (
            <div className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
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
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="superadmin@example.com"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D4AF37",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      color: "#111827",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "10px 40px 10px 12px",
                        border: "1px solid #D4AF37",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        color: "#111827",
                        backgroundColor: "#ffffff",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9ca3af",
                        padding: "0",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: loading ? "#9ca3af" : "#D4AF37",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <p
                style={{
                  marginTop: "20px",
                  fontSize: "12px",
                  color: "#6b7280",
                  textAlign: "center",
                }}
              >
                KsTU E-Vote SuperAdmin Panel © {new Date().getFullYear()}
              </p>
            </div>
          )}

          {/* OTP Verification Card */}
          {showOtp && (
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="bg-[#1c2338] px-8 pt-8 pb-6 text-center">
                <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="text-white" size={28} />
                </div>
                <h2 className="text-lg font-bold text-white">Verify Your Login</h2>
                <p className="text-sm text-gray-300 mt-1">Confirm your identity to continue</p>
              </div>

              <div className="px-8 py-6">
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    A 6-digit code was sent {deliveryMethod === "sms" ? "via SMS to" : "to"}
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {maskedContact || (deliveryMethod === "sms" ? "your registered phone" : "your registered email")}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
