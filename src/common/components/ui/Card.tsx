import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
    return (
        <div
            className={cn(
                'rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#1a1d27] p-6 shadow-xl',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
