"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Sending reset link...");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Password reset link sent to your email!", {
          id: loadingToast,
          duration: 4000,
        });
        setEmailSent(true);
      } else {
        toast.error(
          data.error || "Failed to send reset link. Please try again.",
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
          src="/images/hero_image.jpg"
          alt="Pawavotes background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />

        {/* Forgot Password Card */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur"
          >
            {/* Logo */}
            <div className="mb-8 py-6 flex justify-center items-center">
              <Image
                src="/images/logo.png"
                alt="Pawavotes"
                width={70}
                height={70}
                className="absolute md:right-62 right-48"
              />
              <span className="text-xl font-semibold absolute md:right-40 right-25 text-green-600">
                Pawavotes
              </span>
            </div>

            {!emailSent ? (
              <>
                <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
                  Forgot Password?
                </h1>
                <p className="mb-8 text-center text-gray-600 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

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
                        className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </motion.button>
                </form>

                {/* Back to Login */}
                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="text-sm text-green-600 hover:underline inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900">
                  Check Your Email
                </h1>
                <p className="mb-6 text-gray-600 text-sm">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <p className="mb-8 text-gray-500 text-sm">
                  Click the link in the email to reset your password. If you don't see it, check your spam folder.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </motion.section>
    </>
  );
}
