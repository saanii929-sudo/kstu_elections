"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  buttonText?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'OK',
}: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'error':
        return <AlertTriangle className="w-12 h-12 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-600" />;
      case 'info':
        return <Info className="w-12 h-12 text-blue-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          button: 'bg-green-600 hover:bg-green-700',
          icon: 'bg-green-100',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          button: 'bg-red-600 hover:bg-red-700',
          icon: 'bg-red-100',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          icon: 'bg-yellow-100',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          button: 'bg-blue-600 hover:bg-blue-700',
          icon: 'bg-blue-100',
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className={`${colors.icon} p-3 rounded-full mb-4`}>
                {getIcon()}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {title}
              </h3>

              {/* Message */}
              <p className="text-gray-600 mb-6 whitespace-pre-line">
                {message}
              </p>

              {/* Button */}
              <button
                onClick={onClose}
                className={`w-full px-4 py-2.5 ${colors.button} text-white rounded-lg transition font-medium`}
              >
                {buttonText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
