import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  isLoading = false,
  disabled = false,
}) => {
  const baseClasses = 'px-6 py-3 rounded-lg font-serif transition-all flex items-center justify-center';
  const variantClasses = {
    primary: 'bg-ocean-700 hover:bg-ocean-600 text-white border border-ocean-600',
    secondary: 'bg-ocean-900/50 hover:bg-ocean-800/50 text-ocean-200 border border-ocean-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${className}
        ${(isLoading || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
      ) : (
        children
      )}
    </button>
  );
};
