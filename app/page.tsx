"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";

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

      if (response.ok && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("tokenTimestamp", Date.now().toString());

        // Dismiss the loading toast
        toast.dismiss(loadingToast);

        // Redirect based on role / eventType
        const redirectPath =
          data.user.eventType === "election"
            ? "/election-dashboard"
            : "/dashboard";

        router.push(redirectPath);
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

        {/* Login Card */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
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
              <h1 className="font-bold text-[#1C2338] text-lg">
                Kumasi Technical University
              </h1>
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
                className="w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-white hover:bg-[#D4AF37]"
              >
                Sign In
              </motion.button>
            </form>
          </motion.div>
        </div>
      </motion.section>
    </>
  );
}
