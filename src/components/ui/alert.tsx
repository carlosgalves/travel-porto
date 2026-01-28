import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, CircleAlert } from 'lucide-react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'error' | 'alert';
  onClose?: () => void;
  className?: string;
}

export function Alert({ children, variant = 'alert', onClose, className }: AlertProps) {
  const baseStyles = 'relative w-full rounded-lg border px-4 py-3 pr-10 flex items-start gap-3';
  
  const variantStyles = {
    error: 'bg-destructive text-white border-destructive',
    alert: 'bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-600 dark:border-yellow-700',
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} role="alert">
      <CircleAlert className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 text-white/70 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface AlertTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertTitle({ children, className }: AlertTitleProps) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)}>
      {children}
    </h5>
  );
}

interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)}>
      {children}
    </div>
  );
}
