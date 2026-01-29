import React from 'react';
import { motion } from 'framer-motion';

// Skeleton base component
const Skeleton = ({ className = '', ...props }) => (
    <motion.div
        className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded animate-shimmer bg-[length:200%_100%] ${className}`}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        {...props}
    />
);

// Skeleton for text lines
export const SkeletonText = ({ lines = 3, className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        {[...Array(lines)].map((_, i) => (
            <Skeleton
                key={i}
                className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
            />
        ))}
    </div>
);

// Skeleton for cards
export const SkeletonCard = ({ className = '' }) => (
    <div className={`p-4 rounded-xl border border-white/10 bg-white/5 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
        <SkeletonText lines={2} />
    </div>
);

// Skeleton for table rows
export const SkeletonTableRow = ({ columns = 5 }) => (
    <tr className="border-b border-white/5">
        {[...Array(columns)].map((_, i) => (
            <td key={i} className="py-4 px-4">
                <Skeleton className={`h-4 ${i === 0 ? 'w-3/4' : 'w-1/2'}`} />
            </td>
        ))}
    </tr>
);

// Skeleton for KPI cards
export const SkeletonKpi = ({ className = '' }) => (
    <div className={`p-6 rounded-2xl border border-white/10 bg-white/5 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-20" />
    </div>
);

// Skeleton for conversation list
export const SkeletonConversation = () => (
    <div className="p-3 rounded-lg border border-white/5 bg-white/5">
        <div className="flex justify-between mb-2">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
    </div>
);

export default Skeleton;
