import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 240, height = 80 }: LogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <Image 
        src="/images/logo.png" 
        alt="CPA HCM Logo" 
        width={width} 
        height={height}
        className="object-contain"
        priority
      />
    </div>
  );
}
