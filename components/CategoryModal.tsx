'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const CategoryModal = ({}) => {
    const router = useRouter();
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
            <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -100 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg p-6"
            >
                <h2 className="text-2xl font-semibold mb-4">Select a Category</h2>
                <ul className="space-y-2">
                    <li
                        className="cursor-pointer"
                        onClick={() => router.push('/category/award')}
                    >
                        Awards
                    </li>
                    <li
                        className="cursor-pointer"
                        onClick={() => router.push('/category/nominee')}
                    >
                        Nominees
                    </li>
                </ul>
            </motion.div>
        </motion.div>
    );
};