import React from 'react';

interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function Alert({ variant = 'default', className = '', children }: AlertProps) {
  return (
    <div role="alert" className={`rounded-lg border p-4 ${className}`}>
      {children}
    </div>
  );
}

export function AlertDescription({ className = '', children }: AlertDescriptionProps) {
  return (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>
      {children} 
    </div>
  );
}