"use client";
import React from "react";

interface AnimatedLogoGlowProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function AnimatedLogoGlow({ 
  width = 120, 
  height = 120,
  className = "",
}: AnimatedLogoGlowProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 566.93 566.93"
      className={className}
      style={{ width, height }}
    >
      <defs>
        <linearGradient id="linear-gradient" x1="195.07" y1="-1.4" x2="195.07" y2="216.75" gradientTransform="translate(-.75 4.36) rotate(-.97)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e6e6e5"/>
          <stop offset=".44" stopColor="#f1f0f0"/>
          <stop offset=".74" stopColor="#b4b4b4"/>
          <stop offset="1" stopColor="#818181"/>
        </linearGradient>
        <linearGradient id="linear-gradient-2" x1="242.55" y1="437.02" x2="385.67" y2="185.14" gradientTransform="translate(1.86 -1.98) rotate(.38)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#818181"/>
          <stop offset=".26" stopColor="#b4b4b4"/>
          <stop offset=".56" stopColor="#f1f0f0"/>
          <stop offset="1" stopColor="#e6e6e5"/>
        </linearGradient>
        <linearGradient id="linear-gradient-3" x1="143.78" y1="44.99" x2="278.31" y2="427.58" xlinkHref="#linear-gradient-2"/>
        <linearGradient id="linear-gradient-4" x1="430.91" y1="-55.97" x2="565.43" y2="326.62" xlinkHref="#linear-gradient-2"/>
        <linearGradient id="linear-gradient-5" x1="483.75" y1="8.09" x2="483.75" y2="108.35" xlinkHref="#linear-gradient"/>
        <linearGradient id="linear-gradient-6" x1="492.08" y1="216.37" x2="626.61" y2="29.37" xlinkHref="#linear-gradient-2"/>
        <linearGradient id="linear-gradient-7" x1="360.82" y1="1" x2="360.82" y2="153.82" xlinkHref="#linear-gradient"/>
        <linearGradient id="linear-gradient-8" x1="401.21" y1="289.53" x2="507.12" y2="116.84" xlinkHref="#linear-gradient-2"/>
        <linearGradient id="linear-gradient-9" x1="308.92" y1="-13.08" x2="443.44" y2="369.51" xlinkHref="#linear-gradient-2"/>
      </defs>
      <polygon fill="url(#linear-gradient)" points="351.78 189.73 295.59 216.13 40.02 2.27 351.78 189.73"/>
      <polygon fill="url(#linear-gradient-2)" points="351.78 189.73 295.59 216.13 239.34 567.24 351.78 189.73 351.78 189.73"/>
      <polygon fill="url(#linear-gradient-3)" points="40.02 2.27 240.25 246.36 239.34 567.24 295.59 216.13 40.02 2.27"/>
      <polygon fill="url(#linear-gradient-4)" points="529.64 103.76 412.17 5.47 504.2 117.66 503.78 265.14 529.64 103.76 529.64 103.76"/>
      <polygon fill="url(#linear-gradient-5)" points="529.64 103.76 412.17 5.47 555.46 91.63 529.64 103.76"/>
      <polygon fill="url(#linear-gradient-6)" points="529.64 103.76 503.78 265.14 555.46 91.63 529.64 103.76"/>
      <polygon fill="url(#linear-gradient-7)" points="470.37 132.41 431.02 150.9 251.99 1.09 470.37 132.41"/>
      <polygon fill="url(#linear-gradient-8)" points="470.37 132.41 431.02 150.9 391.61 396.85 470.37 132.41 470.37 132.41"/>
      <polygon fill="url(#linear-gradient-9)" points="251.99 1.09 392.24 172.08 391.61 396.85 431.02 150.9 251.99 1.09"/>
    </svg>
  );
}

