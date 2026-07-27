"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  Variants
} from "framer-motion";
import { useRef, useState } from "react";

const steps = [
  { label: "Create award/election and add nominees" },
  { label: "Share voting link or credentials with voters" },
  { label: "Voters cast votes securely (Web/USSD/Mobile)" },
  { label: "View real-time results and analytics" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.1 },
  },
};

const stepVariant: Variants = {
  hidden: { opacity: 0, x: 60, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const floatVariant = (delay = 0, amplitude = 12) => ({
  y: [0, -amplitude, 0],
  rotate: [0, 3, -3, 0],
  transition: {
    duration: 6 + delay,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay,
  },
});

function CornerImage({
  src,
  alt,
  className,
  floatDelay = 0,
}: {
  src: string;
  alt: string;
  className?: string;
  floatDelay?: number;
}) {
  return (
    <motion.div
      className={`absolute ${className}`}
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      animate={floatVariant(floatDelay, 10)}
    >
      <Image src={src} alt={alt} width={150} height={150} />
    </motion.div>
  );
}

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={stepVariant}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.03, x: 6 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex items-center gap-4 rounded-xl bg-green-600 p-5 cursor-default overflow-hidden"
      style={{ boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.25)" : undefined }}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="shimmer"
            initial={{ x: "-100%", opacity: 0.5 }}
            animate={{ x: "200%", opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={hovered ? { rotate: [0, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-green-700 font-bold text-sm"
      >
        {String(index + 1).padStart(2, "0")}
      </motion.div>

      <p className="font-medium text-white">{step.label}</p>
    </motion.div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const imageY = useSpring(rawY, { stiffness: 80, damping: 20 });

  const bgLightness = useTransform(scrollYProgress, [0, 0.5, 1], [0, 4, 0]);

  return (
    <motion.section
      ref={sectionRef}
      style={{ filter: `brightness(${1 + bgLightness.get() * 0.01})` }}
      className="bg-[#006726] relative px-6 pb-20 text-white md:px-16 overflow-hidden"
    >
        <div className="max-w-7xl mx-auto py-10 pb-10 lg:pb-20 ">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-white/90 text-sm font-medium">Quick Vote via USSD</p>
                <p className="text-white/70 text-xs">Dial from any mobile phone</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl px-6 py-3">
              <span className="text-white font-bold text-2xl md:text-3xl tracking-widest">*928*121#</span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-white/80 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Fast & Easy</span>
            </div>
          </div>
        </div>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <CornerImage
          src="/images/brutalist-52.png"
          alt="Brutal 52"
          className="top-0 left-0"
          floatDelay={0}
        />
        <CornerImage
          src="/images/brutalist-94.png"
          alt="Brutal 94"
          className="bottom-0 left-0"
          floatDelay={1.5}
        />
        <CornerImage
          src="/images/brutalist-59.png"
          alt="Brutal 59"
          className="top-0 right-0"
          floatDelay={0.8}
        />
        <CornerImage
          src="/images/brutalist-100.png"
          alt="Brutal 100"
          className="bottom-0 right-0"
          floatDelay={2.2}
        />
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, #00ff6a22, transparent)",
        }}
      />
      <motion.h2
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.6 }}
        className="mb-3 text-center text-3xl font-bold relative z-10"
      >
        How Pawavotes Works
      </motion.h2>

      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.6 }}
        transition={{ delay: 0.1 }}
        className="mb-12 text-center text-white/80 relative z-10"
      >
        A simple, secure process built for transparent digital voting.
      </motion.p>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 relative z-10">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="relative rounded-xl overflow-hidden bg-green-600"
          style={{ willChange: "transform" }}
        >
          <motion.div
            className="absolute inset-0 bg-[#006726] z-10 origin-top"
            initial={{ scaleY: 1 }}
            whileInView={{ scaleY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
          <motion.div style={{ y: imageY }} className="will-change-transform">
            <Image
              src="/images/hero_image.jpeg"
              alt="Hero"
              className="rounded-xl w-full h-auto"
              width={680}
              height={650}
              style={{ objectFit: "cover", display: "block" }}
            />
          </motion.div>
        </motion.div>
        <motion.div
          className="space-y-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}