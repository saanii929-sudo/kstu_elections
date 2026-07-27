"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Menu, X } from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const navContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const navItem: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1] },
  },
};

const titleContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.5 } },
};

const letterVariant: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.85, rotateX: -40 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const heroText: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 1.2, ease: [0.42, 0, 0.58, 1] },
  },
};

const buttonVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 1.5, ease: [0.42, 0, 0.58, 1] },
  },
};

type ParticleShape =
  | "circle"
  | "square"
  | "ring"
  | "triangle"
  | "star"
  | "hexagon"
  | "cross"
  | "teardrop"
  | "diamond";

function ShapeSVG({ shape, size, opacity }: { shape: ParticleShape; size: number; opacity: number }) {
  const color = `rgba(74,222,128,${opacity})`;
  const strokeColor = `rgba(74,222,128,${opacity})`;
  const s = size;

  switch (shape) {
    case "circle":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill={color} />
        </svg>
      );
    case "ring":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke={strokeColor} strokeWidth="8" />
        </svg>
      );
    case "square":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <rect x="10" y="10" width="80" height="80" rx="6" fill={color} />
        </svg>
      );
    case "diamond":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <polygon points="50,5 95,50 50,95 5,50" fill={color} />
        </svg>
      );
    case "triangle":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <polygon points="50,8 94,90 6,90" fill={color} />
        </svg>
      );
    case "star":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <polygon
            points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
            fill={color}
          />
        </svg>
      );
    case "hexagon":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill="none" stroke={strokeColor} strokeWidth="7" />
        </svg>
      );
    case "cross":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <rect x="38" y="5" width="24" height="90" rx="5" fill={color} />
          <rect x="5" y="38" width="90" height="24" rx="5" fill={color} />
        </svg>
      );
    case "teardrop":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <path d="M50,5 C70,5 88,30 88,55 A38,38 0 0,1 12,55 C12,30 30,5 50,5 Z" fill={color} />
        </svg>
      );
    default:
      return null;
  }
}

function Particle({
  x,
  delay,
  size,
  driftX = 0,
  duration = 10,
  shape = "circle",
  opacity = 0.6,
}: {
  x: string;
  delay: number;
  size: number;
  driftX?: number;
  duration?: number;
  shape?: ParticleShape;
  opacity?: number;
}) {
  const spinShapes: ParticleShape[] = ["square", "diamond", "triangle", "star", "cross", "hexagon"];
  const shouldSpin = spinShapes.includes(shape);

  return (
    <motion.div
      className="absolute bottom-0 pointer-events-none"
      style={{ left: x, width: size, height: size }}
      animate={{
        y: [0, -1000],
        x: [0, driftX, -driftX / 2, driftX * 0.3],
        opacity: [0, 1, 0.85, 0],
        scale: [0.7, 1.2, 1.5, 0.5],
        rotate: shouldSpin ? [0, 120, 240, 360] : [0, 15, -10, 5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
        times: [0, 0.3, 0.7, 1],
      }}
    >
      <ShapeSVG shape={shape} size={size} opacity={opacity} />
    </motion.div>
  );
}

function GlowOrb({ x, delay }: { x: string; delay: number }) {
  return (
    <motion.div
      className="absolute bottom-0 pointer-events-none rounded-full"
      style={{
        left: x,
        width: 40,
        height: 40,
        background:
          "radial-gradient(circle, rgba(74,222,128,0.5) 0%, rgba(74,222,128,0.1) 60%, transparent 100%)",
        filter: "blur(4px)",
      }}
      animate={{
        y: [0, -900],
        x: [0, 30, -20, 10],
        opacity: [0, 0.9, 0.7, 0],
        scale: [1, 2, 1.5, 0.5],
      }}
      transition={{
        duration: 12 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute inset-x-0 h-0.5 bg-linear-to-r from-transparent via-green-400/70 to-transparent z-10 pointer-events-none"
      initial={{ top: "0%", opacity: 0 }}
      animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
      transition={{ duration: 1.6, delay: 0.2, ease: [0.42, 0, 0.58, 1] }}
    />
  );
}

const TITLE = "Pawavotes";

const particles: {
  x: string;
  delay: number;
  size: number;
  driftX?: number;
  duration?: number;
  shape?: ParticleShape;
  opacity?: number;
}[] = [
  // Circles
  { x: "3%",  delay: 0,   size: 8,  driftX: 15,  duration: 7,  shape: "circle",   opacity: 0.5 },
  { x: "14%", delay: 0.4, size: 14, driftX: 25,  duration: 11, shape: "circle",   opacity: 0.4 },
  { x: "33%", delay: 2.5, size: 7,  driftX: -10, duration: 6,  shape: "circle",   opacity: 0.55 },
  { x: "53%", delay: 1.7, size: 16, driftX: 18,  duration: 10, shape: "circle",   opacity: 0.45 },
  { x: "73%", delay: 1.3, size: 9,  driftX: -12, duration: 7,  shape: "circle",   opacity: 0.55 },
  { x: "93%", delay: 2.2, size: 11, driftX: 14,  duration: 8,  shape: "circle",   opacity: 0.5  },
  // Rings
  { x: "24%", delay: 1.8, size: 22, driftX: 15,  duration: 13, shape: "ring",     opacity: 0.5  },
  { x: "55%", delay: 3.2, size: 28, driftX: -18, duration: 15, shape: "ring",     opacity: 0.45 },
  { x: "77%", delay: 0.5, size: 20, driftX: 22,  duration: 12, shape: "ring",     opacity: 0.5  },
  // Squares
  { x: "8%",  delay: 1.5, size: 12, driftX: -20, duration: 10, shape: "square",   opacity: 0.4  },
  { x: "62%", delay: 1.2, size: 14, driftX: 18,  duration: 9,  shape: "square",   opacity: 0.4  },
  // Diamonds
  { x: "19%", delay: 2.9, size: 16, driftX: -22, duration: 11, shape: "diamond",  opacity: 0.45 },
  { x: "47%", delay: 3.8, size: 12, driftX: -25, duration: 9,  shape: "diamond",  opacity: 0.5  },
  { x: "86%", delay: 0.7, size: 18, driftX: 20,  duration: 12, shape: "diamond",  opacity: 0.4  },
  // Triangles
  { x: "5%",  delay: 3.1, size: 14, driftX: 18,  duration: 10, shape: "triangle", opacity: 0.4  },
  { x: "38%", delay: 0.9, size: 20, driftX: -15, duration: 13, shape: "triangle", opacity: 0.35 },
  { x: "69%", delay: 2.4, size: 16, driftX: 22,  duration: 11, shape: "triangle", opacity: 0.4  },
  // Stars
  { x: "28%", delay: 1.0, size: 18, driftX: 20,  duration: 12, shape: "star",     opacity: 0.5  },
  { x: "60%", delay: 4.0, size: 14, driftX: -18, duration: 10, shape: "star",     opacity: 0.45 },
  { x: "90%", delay: 1.6, size: 22, driftX: 12,  duration: 14, shape: "star",     opacity: 0.4  },
  // Hexagons
  { x: "11%", delay: 2.0, size: 24, driftX: -16, duration: 14, shape: "hexagon",  opacity: 0.4  },
  { x: "44%", delay: 0.3, size: 20, driftX: 24,  duration: 12, shape: "hexagon",  opacity: 0.35 },
  { x: "80%", delay: 3.5, size: 26, driftX: -20, duration: 15, shape: "hexagon",  opacity: 0.4  },
  // Crosses
  { x: "35%", delay: 2.7, size: 12, driftX: 16,  duration: 9,  shape: "cross",    opacity: 0.45 },
  { x: "72%", delay: 1.1, size: 10, driftX: -14, duration: 8,  shape: "cross",    opacity: 0.5  },
  // Teardrops
  { x: "50%", delay: 0.6, size: 16, driftX: 20,  duration: 11, shape: "teardrop", opacity: 0.4  },
  { x: "17%", delay: 3.3, size: 20, driftX: -18, duration: 13, shape: "teardrop", opacity: 0.38 },
  { x: "83%", delay: 1.9, size: 14, driftX: 15,  duration: 10, shape: "teardrop", opacity: 0.42 },
];

const glowOrbs = [
  { x: "15%", delay: 0 },
  { x: "42%", delay: 2.5 },
  { x: "70%", delay: 1.3 },
  { x: "88%", delay: 4 },
];

export default function HeroSection() {
  const [open, setOpen] = useState(false);

  function handleRedirectToContact() {
    window.location.href = "/contact-us";
  }
  function handleRedirectToFindVote() {
    window.location.href = "/find-vote";
  }

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="relative min-h-125 w-full overflow-hidden"
    >
      <Image
        src="/images/hero_image.jpg"
        alt="Pawavotes background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)] pointer-events-none z-1" />

      <ScanLine />

      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {glowOrbs.map((o, i) => (
        <GlowOrb key={`orb-${i}`} {...o} />
      ))}

      <motion.nav
        variants={navContainer}
        initial="hidden"
        animate="visible"
        className="absolute top-0 z-20 flex w-full items-center justify-between px-4 py-5 sm:px-6 md:px-16"
      >
        <motion.div variants={navItem}>
          <Image
            src="/images/logo.png"
            alt="Pawavotes"
            width={100}
            height={100}
          />
        </motion.div>
        <ul className="hidden items-center gap-16 text-lg text-white md:flex">
          {["Home", "Ticketing", "Events"].map((label) => (
            <motion.li
              key={label}
              variants={navItem}
              className="relative cursor-pointer group"
            >
              <span className="hover:text-green-300 transition-colors duration-200">
                {label === "Home" ? (
                  <a href="/">{label}</a>
                ) : label === "Events" ? (
                  <a href="/find-vote">{label}</a>
                ) : label === "Ticketing" ? (
                  <a href="/ticketing">{label}</a>
                ) : (
                  label
                )}
              </span>
              {label !== "Ticketing" && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-green-400 transition-all duration-300 group-hover:w-full" />
              )}
            </motion.li>
          ))}
        </ul>

        <motion.button
          variants={navItem}
          onClick={handleRedirectToContact}
          whileHover={{ scale: 1.06, backgroundColor: "#16a34a" }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="hidden cursor-pointer rounded bg-green-600 px-5 py-3 text-sm font-semibold text-white md:block"
        >
          Contact Us
        </motion.button>
        <motion.button
          variants={navItem}
          onClick={() => setOpen(true)}
          className="text-white md:hidden"
          whileTap={{ scale: 0.9 }}
        >
          <Menu size={28} />
        </motion.button>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-green-900 p-6 text-white"
            >
              <div className="flex items-center justify-between mb-10 px-2">
                <span className="text-xl font-bold">Menu</span>
                <motion.button
                  onClick={() => setOpen(false)}
                  whileTap={{ rotate: 90, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={26} />
                </motion.button>
              </div>

              <ul className="space-y-6 text-lg">
                {[
                  { label: "Home", href: "/" },
                  { label: "Ticketing", href: null },
                  { label: "Events", href: "/find-vote" },
                ].map(({ label, href }, i) => (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                    className={`transition-colors ${href ? "hover:text-green-300" : "opacity-70 cursor-default"}`}
                  >
                    {href ? <a href={href}>{label}</a> : <span>{label}</span>}
                  </motion.li>
                ))}
              </ul>

              <motion.button
                onClick={handleRedirectToContact}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="mt-10 w-50 rounded bg-green-600 py-3 font-semibold"
              >
                Contact Us
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex pt-40 pb-20 sm:pb-35 items-center justify-center perspective-midrange">
        <motion.h1
          variants={titleContainer}
          initial="hidden"
          animate="visible"
          aria-label={TITLE}
          className="px-4 text-center text-[14vw] sm:text-[12vw] md:text-[12vw] font-extrabold leading-none select-none"
          style={{ transformStyle: "preserve-3d" }}
        >
          {TITLE.split("").map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariant}
              className="inline-block text-white relative"
              whileHover={{
                scale: 1.15,
                color: "#4ade80",
                textShadow: "0 0 30px rgba(74,222,128,0.8)",
                transition: { duration: 0.15 },
              }}
            >
              {char}
            </motion.span>
          ))}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ backgroundPosition: "-200% center" }}
            animate={{ backgroundPosition: "200% center" }}
            transition={{ duration: 2.2, delay: 1.1, ease: [0.42, 0, 0.58, 1] }}
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              mixBlendMode: "overlay",
            }}
          />
        </motion.h1>
      </div>

      <motion.div
        variants={heroText}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-6xl px-6"
      >
        <motion.p
          className="max-w-xl text-base sm:text-lg md:text-2xl text-white/80"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.7 }}
        >
          Pawavotes enables secure public voting and verifiable institutional
          elections with audit-ready results.
        </motion.p>

        <motion.button
          variants={buttonVariant}
          initial="hidden"
          animate="visible"
          onClick={handleRedirectToFindVote}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 0 24px rgba(74,222,128,0.55)",
            backgroundColor: "#16a34a",
          }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="mt-8 cursor-pointer mb-10 rounded bg-green-600 px-6 py-4 text-lg font-semibold text-white relative overflow-hidden"
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5 }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
            }}
          />
          Vote Now
        </motion.button>
      </motion.div>
    </motion.section>
  );
}