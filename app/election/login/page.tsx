"use client";

import {
  useState,
  useEffect,
  useRef,
  FormEvent,
  KeyboardEvent,
  ClipboardEvent,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Lock,
  IdCard,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  ShieldAlert,
  Clock,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

type PageStatus = "verifying" | "login-form" | "error" | "not-started";

function VoterLoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The secure link has no `key=` — the entire query string IS the hash
  // (e.g. /election/login?3f9a1c...), so the first (only) param key is it.
  const linkHash = searchParams.keys().next().value || null;

  const [status, setStatus] = useState<PageStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [votingStartDate, setVotingStartDate] = useState<string | null>(null);
  const [voterFirstName, setVoterFirstName] = useState("");

  // Manual login form — the link only unlocks this form, it doesn't log
  // the voter in by itself.
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Tracks the voter's canonical token once known, for the OTP step
  const [activeVoterToken, setActiveVoterToken] = useState("");

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpContact, setOtpContact] = useState<{ maskedPhone?: string }>({});
  const [pendingVoterData, setPendingVoterData] = useState<any>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if voter is already authenticated
  useEffect(() => {
    const voterToken = localStorage.getItem("voterToken");
    const voterData = localStorage.getItem("voterData");
    const tokenTimestamp = localStorage.getItem("voterTokenTimestamp");

    if (voterToken && voterData && tokenTimestamp) {
      try {
        const data = JSON.parse(voterData);
        const timestamp = parseInt(tokenTimestamp);
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000;

        if (now - timestamp > sixHours) {
          localStorage.removeItem("voterToken");
          localStorage.removeItem("voterData");
          localStorage.removeItem("voterTokenTimestamp");
        } else if (!data.hasVoted) {
          router.push(`/election?token=${voterToken}`);
        }
      } catch {
        localStorage.removeItem("voterToken");
        localStorage.removeItem("voterData");
        localStorage.removeItem("voterTokenTimestamp");
      }
    }
  }, [router]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const otpValue = digits.join("");

  const sendOtp = async (
    voterToken: string,
  ): Promise<{ maskedEmail?: string; maskedPhone?: string } | null> => {
    try {
      const res = await fetch("/api/elections/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) return data.data;
      toast.error(data.error || "Failed to send OTP");
      return null;
    } catch {
      toast.error("Failed to send OTP");
      return null;
    }
  };

  const proceedAfterLogin = async (voterData: {
    token: string;
    election?: { settings?: { requireOTP?: boolean } };
    [key: string]: unknown;
  }) => {
    const voterToken = voterData.token as string;
    setActiveVoterToken(voterToken);

    if (voterData?.election?.settings?.requireOTP) {
      setPendingVoterData(voterData);
      toast.loading("Sending OTP…");
      const contact = await sendOtp(voterToken);
      toast.dismiss();
      if (contact) {
        setOtpContact(contact);
        setDigits(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setShowOtpModal(true);
        setTimeout(() => digitRefs.current[0]?.focus(), 100);
      }
    } else {
      localStorage.setItem("voterToken", voterToken);
      localStorage.setItem("voterData", JSON.stringify(voterData));
      localStorage.setItem("voterTokenTimestamp", Date.now().toString());
      router.push(`/election?token=${voterToken}`);
    }
  };

  // Verify the secure link on load. This only unlocks the login form below
  // — it does not sign the voter in on its own.
  useEffect(() => {
    if (!linkHash) {
      router.replace("/election/no-access");
      return;
    }

    (async () => {
      try {
        const response = await fetch("/api/elections/auth/verify-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkHash }),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setVoterFirstName(data.data?.name || "");
          setStatus("login-form");
        } else if (data.startDate) {
          setVotingStartDate(data.startDate);
          setStatus("not-started");
        } else {
          setErrorMessage(
            data.error || "This voting link is invalid or has expired."
          );
          setStatus("error");
        }
      } catch {
        setErrorMessage("Network error verifying your voting link. Please try again.");
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkHash]);

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    const loadingToast = toast.loading("Verifying credentials...");

    try {
      const response = await fetch("/api/elections/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkHash,
          studentId: studentId.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.dismiss(loadingToast);
        await proceedAfterLogin(data.data);
      } else {
        toast.error(data.error || "Invalid credentials", {
          id: loadingToast,
          duration: 4000,
        });
      }
    } catch {
      toast.error("Network error. Please try again.", {
        id: loadingToast,
        duration: 4000,
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        digitRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleDigitPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    digitRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/elections/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterToken: activeVoterToken,
          otp: otpValue,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("OTP verified!");
        setShowOtpModal(false);
        localStorage.setItem("voterToken", activeVoterToken);
        localStorage.setItem("voterData", JSON.stringify(pendingVoterData));
        localStorage.setItem("voterTokenTimestamp", Date.now().toString());
        router.push(`/election?token=${activeVoterToken}`);
      } else {
        toast.error(data.error || "Invalid OTP");
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
      }
    } catch {
      toast.error("Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    const contact = await sendOtp(activeVoterToken);
    if (contact) {
      setOtpContact(contact);
      setDigits(["", "", "", "", "", ""]);
      setResendCooldown(60);
      toast.success("OTP resent successfully");
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    }
    setResendLoading(false);
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setPendingVoterData(null);
    setDigits(["", "", "", "", "", ""]);
    setResendCooldown(0);
    // The link is still valid — send them back to the login form rather
    // than a dead end.
    setStatus("login-form");
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#363636",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#15803d", secondary: "#fff" } },
          error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />

      <motion.section
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="relative min-h-screen w-full"
      >
        <Image
          src="/images/hero_image.jpeg"
          alt="Pawavotes background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          {/* ── Verifying secure link ── */}
          {status === "verifying" && !showOtpModal && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="w-full relative max-w-md rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur text-center"
            >
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#1C2338] font-semibold">Verifying your secure voting link…</p>
            </motion.div>
          )}

          {/* ── Invalid / expired link ── */}
          {status === "error" && !showOtpModal && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur text-center"
            >
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="text-red-500" size={26} />
              </div>
              <h1 className="text-lg font-bold text-[#1C2338] mb-2">Unable to Sign You In</h1>
              <p className="text-sm text-gray-500">{errorMessage}</p>
              <p className="text-xs text-gray-400 mt-4">
                Contact your election administrator if you believe this is a mistake.
              </p>
            </motion.div>
          )}

          {/* ── Voting not yet open ── */}
          {status === "not-started" && !showOtpModal && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur text-center"
            >
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-amber-500" size={26} />
              </div>
              <h1 className="text-lg font-bold text-[#1C2338] mb-2">Voting Not Yet Open</h1>
              {votingStartDate && (
                <p className="text-sm text-gray-500">
                  Voting begins on{" "}
                  <span className="font-bold text-gray-700">
                    {new Date(votingStartDate).toLocaleString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  . Come back and use your link again once it starts.
                </p>
              )}
            </motion.div>
          )}

          {/* ── Login form (link verified — voter must still enter credentials) ── */}
          {status === "login-form" && !showOtpModal && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur"
            >
              <div className="flex-col mb-3 flex justify-center items-center">
                <Image
                  src="/images/logo.png"
                  alt="KsTU E-Vote"
                  width={100}
                  height={100}
                />
                <h1 className="font-bold text-[#1C2338] text-lg">
                  Kumasi Technical University
                </h1>
                {voterFirstName && (
                  <p className="text-sm text-gray-500 mt-1">
                    Welcome back, enter your student number and password to continue.
                  </p>
                )}
              </div>

              <form className="space-y-5" onSubmit={handleLoginSubmit}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Student Number
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter your student number"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      value={password}
                      minLength={6}
                      disabled={loginLoading}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-11 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
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

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loginLoading}
                  className="w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-white hover:bg-[#D4AF37] disabled:opacity-60 transition"
                >
                  {loginLoading ? "Verifying..." : "Login to Vote"}
                </motion.button>
              </form>

              <div className="text-center mt-6">
                <p className="text-gray-500 text-sm">
                  Powered by KsTU Election System
                </p>
              </div>
            </motion.div>
          )}

          {/* ── OTP Verification Card ── */}
          {showOtpModal && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Header strip */}
              <div className="bg-[#D4AF37] px-8 pt-8 pb-6 text-center">
                <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="text-white" size={28} />
                </div>
                <h2 className="text-lg font-bold text-white">
                  SMS Verification
                </h2>
                <p className="text-sm text-green-200 mt-1">
                  Confirm your identity to continue
                </p>
              </div>

              {/* Body */}
              <div className="px-8 py-6">
                {/* Contact info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    A 6-digit code was sent via SMS to
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {otpContact.maskedPhone || "your registered phone number"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Check your messages and enter the code below
                  </p>
                </div>

                {/* Digit boxes */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        digitRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      onPaste={handleDigitPaste}
                      className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                        ${d ? "border-[#D4AF37] bg-green-50 text-green-800" : "border-gray-200 bg-gray-50 text-gray-900"}
                        focus:border-[#D4AF37] focus:bg-white focus:shadow-sm`}
                    />
                  ))}
                </div>

                {/* Verify button */}
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpValue.length < 6}
                  className="w-full py-3 bg-[#D4AF37] text-white rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
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

                {/* Resend + Back row */}
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={handleResendOtp}
                    disabled={resendLoading || resendCooldown > 0}
                    className="text-[#D4AF37] font-medium hover:text-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {resendLoading
                      ? "Sending…"
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend code"}
                  </button>
                  <button
                    onClick={closeOtpModal}
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

export default function VoterLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <VoterLoginPageInner />
    </Suspense>
  );
}
