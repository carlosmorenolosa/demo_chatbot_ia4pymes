import React, { useState } from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
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
            <textarea
                className={cn(
                    'relative flex min-h-[120px] w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white shadow-sm transition-all duration-300',
                    'placeholder:text-slate-500',
                    'focus-visible:outline-none focus-visible:ring-0',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'resize-none',
                    className
                )}
                ref={ref}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
            />
        </div>
    );
});
Textarea.displayName = 'Textarea';

export { Textarea };
