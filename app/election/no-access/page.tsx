"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function NoAccessPage() {
  return (
    <section className="relative min-h-screen w-full">
      <Image
        src="/images/hero_image.jpeg"
        alt="KsTU-Evote background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur text-center"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="text-red-500" size={30} />
          </div>
          <h1 className="text-xl font-bold text-[#1C2338] mb-2">Invalid voting link</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            This voting link is incomplete or malformed, so we can&apos;t identify which
            election it&apos;s for.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mt-3">
            If you have multiple election credentials, make sure you&apos;re opening the
            exact link sent to you for this specific election, then try again.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
