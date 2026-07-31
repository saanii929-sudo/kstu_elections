"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function NoAccessPage() {
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
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur text-center"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="text-green-600" size={30} />
          </div>
          <h1 className="text-xl font-bold text-[#1C2338] mb-2">You've already voted</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            You have already voted for this election.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mt-3">
            The link you are trying to access is invalid or has already been used.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
