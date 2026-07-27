"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

export default function HelpdeskLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if helpdesk user is already authenticated
  useEffect(() => {
    const helpdeskToken = localStorage.getItem('helpdeskToken');
    const helpdeskUser = localStorage.getItem('helpdeskUser');
    const tokenTimestamp = localStorage.getItem('helpdeskTokenTimestamp');
    
    if (helpdeskToken && helpdeskUser && tokenTimestamp) {
      const timestamp = parseInt(tokenTimestamp);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
      
      // Check if token is expired (older than 6 hours)
      if (now - timestamp > sixHours) {
        // Token expired, clear storage
        localStorage.removeItem('helpdeskToken');
        localStorage.removeItem('helpdeskUser');
        localStorage.removeItem('helpdeskTokenTimestamp');
        toast.error('Session expired. Please login again.');
      } else {
        // Token still valid, redirect
        router.push('/helpdesk-portal');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/helpdesk/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("helpdeskToken", data.token);
        localStorage.setItem("helpdeskUser", JSON.stringify(data.user));
        localStorage.setItem("helpdeskTokenTimestamp", Date.now().toString());
        toast.success("Login successful!");
        router.push("/helpdesk-portal");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />

      <div className="relative min-h-screen w-full">
        {/* Background */}
        <Image
          src="/images/hero_image.jpg"
          alt="Pawavotes background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
            <div className="text-center mb-4">
              {/* Logo */}
              <div className="mb-8 py-6 flex justify-center items-center">
                <Image
                  src="/images/logo.png"
                  alt="Pawavotes"
                  width={70}
                  height={70}
                  className="absolute md:right-62 right-48"
                />{" "}
                <span className="text-xl font-semibold absolute md:right-40 right-25  text-green-600">
                  Pawavotes
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Help Desk Portal
              </h1>
              <p className="text-gray-600">Sign in to assist voters</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact your election administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
