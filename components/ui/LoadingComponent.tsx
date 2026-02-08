import React from 'react';

interface LoadingComponentProps {
  size?: 'small' | 'medium' | 'large';
}

export const LoadingComponent: React.FC<LoadingComponentProps> = ({
  size = 'medium',
}) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-1/2 h-1/2',
    large: 'w-48 h-48',
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-[#EFEAD8]">
      <div className="flex flex-col items-center justify-center z-10">
        <img 
          src="/loading.gif" 
          alt="Loading" 
          className={`${sizeClasses[size]} animate-pulse`}
        />
        <p className="mt-6 font-theme text-5xl text-[#5D4037] tracking-wider font-bold">
          Loading......
        </p>
      </div>
    </div>
  );
};
