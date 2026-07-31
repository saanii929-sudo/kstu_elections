"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

// Deliberately self-contained — no auth, no localStorage read. By the time a
// voter lands here, their session data has already been cleared, and anyone
// else who reaches this URL directly just sees a generic thank-you, which is
// harmless since it carries no voter-specific information.
export default function ThankYouPage() {
  return (
    <section className="relative min-h-screen w-full">
      <Image
        src="/images/hero_image.jpeg"
        alt="Pawavotes background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md rounded-2xl bg-white/95 p-8 sm:p-10 shadow-2xl backdrop-blur text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15, type: "spring", bounce: 0.5 }}
            className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="text-[#D4AF37]" size={40} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex justify-center mb-4">
              <Image src="/images/logo.png" alt="KsTU E-Vote" width={56} height={56} />
            </div>
            <h1 className="text-2xl font-bold text-[#1C2338] mb-2">
              Thank You for Voting!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your vote has been securely recorded. Every voice matters in shaping the
              outcome of this election, and yours has now been counted.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed mt-3">
              Your voting link and credentials have now been used and are no longer active.
            </p>

            <div className="mt-7 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                You may now safely close this window.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
