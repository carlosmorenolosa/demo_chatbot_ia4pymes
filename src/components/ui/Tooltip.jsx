import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({
    children,
    content,
    position = 'right',
    delay = 200,
    showIcon = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const triggerRef = useRef(null);
    const timeoutRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                bottom: rect.bottom,
                right: rect.right
            });
        }
    }, []);

    const handleMouseEnter = useCallback(() => {
        // Limpiar cualquier timeout previo
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        updatePosition();
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    }, [delay, updatePosition]);

    const handleMouseLeave = useCallback(() => {
        // Limpiar timeout inmediatamente
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        // Ocultar inmediatamente sin delay
        setIsVisible(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Update position on scroll/resize when visible
    useEffect(() => {
        if (isVisible) {
            const handleUpdate = () => updatePosition();
            window.addEventListener('scroll', handleUpdate, true);
            window.addEventListener('resize', handleUpdate);
            return () => {
                window.removeEventListener('scroll', handleUpdate, true);
                window.removeEventListener('resize', handleUpdate);
            };
        }
    }, [isVisible, updatePosition]);

    // Calcular posición del tooltip
    const getPortalStyle = () => {
        const gap = 12;
        const baseStyle = { position: 'fixed', zIndex: 99999, pointerEvents: 'none' };

        switch (position) {
            case 'top':
                return {
                    ...baseStyle,
                    top: coords.top - gap,
                    left: coords.left + coords.width / 2,
                    transform: 'translate(-50%, -100%)'
                };
            case 'bottom':
                return {
                    ...baseStyle,
                    top: coords.bottom + gap,
                    left: coords.left + coords.width / 2,
                    transform: 'translate(-50%, 0)'
                };
            case 'left':
                return {
                    ...baseStyle,
                    top: coords.top + coords.height / 2,
                    left: coords.left - gap,
                    transform: 'translate(-100%, -50%)'
                };
            case 'right':
            default:
                return {
                    ...baseStyle,
                    top: coords.top + coords.height / 2,
                    left: coords.right + gap,
                    transform: 'translate(0, -50%)'
                };
        }
    };

    return (
        <>
            <div
                ref={triggerRef}
                className="relative inline-flex items-center"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
                {showIcon && (
                    <HelpCircle className="w-4 h-4 ml-1.5 text-gray-400 hover:text-gray-300 cursor-help transition-colors" />
                )}
            </div>
            {createPortal(
                <AnimatePresence mode="wait">
                    {isVisible && (
                        <motion.div
                            key="tooltip"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            style={getPortalStyle()}
                        >
                            <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-md shadow-lg border border-slate-700 whitespace-nowrap">
                                {content}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

// Tooltip trigger for section headers
export const SectionTooltip = ({ title, description, children }) => (
    <Tooltip
        content={
            <div>
                <p className="font-semibold mb-1">{title}</p>
                <p className="text-gray-300 text-xs">{description}</p>
            </div>
        }
        position="top"
        showIcon
    >
        {children}
    </Tooltip>
);

export default Tooltip;
