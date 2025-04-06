'use client';

import Image from 'next/image';
import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

const CoffeeSwapLogo: React.FC<LogoProps> = ({ 
  width = 40, 
  height = 40,
  className = '' 
}) => {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/coffeeswap-logo.png"
        alt="CoffeeSwap Logo"
        width={width}
        height={height}
        priority
      />
    </div>
  );
};

export default CoffeeSwapLogo;