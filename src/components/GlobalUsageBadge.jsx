import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';

const GlobalUsageBadge = ({ count = 0, isLoading = false }) => {
    // Animación del número usando useSpring para suavidad
    const springCount = useSpring(0, { bounce: 0, duration: 1500 });
    const displayCount = useTransform(springCount, (latest) => Math.floor(latest).toLocaleString());
    const [displayValue, setDisplayValue] = useState("0");

    useEffect(() => {
        springCount.set(count);
    }, [count, springCount]);

    useEffect(() => {
        const unsubscribe = displayCount.on("change", (latest) => {
            setDisplayValue(latest);
        });
        return () => unsubscribe();
    }, [displayCount]);

    return (
        <div className="relative group w-full px-4 mb-4">
            {/* Fondo con blur y gradiente sutil */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-700"></div>

            <div className="relative flex flex-col p-3 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden hover:border-purple-500/30 transition-colors duration-300">
                {/* Brillo decorativo */}
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>

                <div className="flex justify-between items-center mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                        <Sparkles size={12} className="text-purple-400 animate-pulse" />
                        Respuestas Automatizadas
                    </span>
                    {isLoading && <div className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />}
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                        {displayValue}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">generadas</span>
                </div>

                {/* Barra de progreso decorativa o indicador de actividad */}
                <div className="w-full h-0.5 bg-white/5 mt-3 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    />
                </div>
            </div>
        </div>
    );
};

export default GlobalUsageBadge;
