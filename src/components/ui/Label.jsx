import React from 'react';
import { cn } from '../../lib/utils';

const Label = React.forwardRef(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            'text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            className
        )}
        {...props}
    />
));
Label.displayName = 'Label';

export { Label };
