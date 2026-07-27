import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

export default function FAQSection() {
  const faqs = [
    {
      question: "Can someone vote twice?",
      answer:
        "No. Each voter can only vote once per position or category. Pawavotes enforces strict one-person-one-vote rules using identity verification, unique voter records, and anti-duplicate safeguards to prevent multiple submissions.",
    },
    { 
      question: "How are voters verified?", 
      answer: "For public voting (awards), voters are verified through mobile money payment authentication and phone number validation. For institutional elections, voters receive unique credentials (voter ID and password) via email or SMS, ensuring only authorized individuals can participate. The system tracks each voter to prevent duplicate voting." 
    },
    { 
      question: "When are results released?", 
      answer: "Results are available in real-time through the leaderboard for public awards. For institutional elections, results are released immediately after the voting period ends and can be viewed in the results dashboard. Organizers have full control over when to publish results to voters and the public." 
    },
    { 
      question: "Can elections be audited?", 
      answer: "Yes. Pawavotes provides comprehensive audit trails including vote timestamps, payment records, voter activity logs, and detailed analytics. Organizers can export voting data, view real-time statistics, and generate reports for transparency and verification purposes. All transactions are securely logged for accountability." 
    },
  ];

  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="w-full bg-white py-20 px-4">
      <div className="max-w-3xl mx-auto text-center mb-14">
        <h2 className="text-3xl font-bold text-green-600 mb-3">
          Frequently Asked Questions
        </h2>
        <p className="text-gray-500">
          Find quick answers about voter verification, results, and platform reliability.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="bg-gray-50 rounded-2xl px-6 py-5 shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </span>
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white">
                  {isOpen ? <Minus size={20} /> : <Plus size={20} />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && faq.answer && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="mt-4 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
