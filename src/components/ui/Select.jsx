import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative group">
            {/* Animated Gradient Border */}
            <div
                className={cn(
                    "absolute -inset-[1px] rounded-lg bg-gradient-to-r from-primary via-purple-500 to-blue-500 opacity-0 transition-opacity duration-500 blur-[2px]",
                    isFocused ? "opacity-100" : "group-hover:opacity-50"
                )}
            />
            <div className="relative">
                <select
                    className={cn(
                        'relative flex h-12 w-full appearance-none rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-white shadow-sm transition-all duration-300',
                        'focus:outline-none focus:ring-0',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'cursor-pointer',
                        className
                    )}
                    ref={ref}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-transform duration-300",
                    isFocused && "transform rotate-180 text-primary"
                )} />
            </div>
        </div>
    );
});
Select.displayName = 'Select';

export { Select };
