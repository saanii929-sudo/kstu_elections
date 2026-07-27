'use client';

import { motion } from 'framer-motion';

export default function StatCard({ color }: { color: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white border rounded-2xl p-6 h-32"
    >
      <div className={`w-10 h-10 rounded-lg ${color}`} />
    </motion.div>
  );
}
