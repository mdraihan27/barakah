import React from 'react';

export default function LandingWave({ className = '' }) {
  return (
    <div className={`pointer-events-none overflow-hidden bg-primary-green-1 ${className}`}>
      {/* Full green background + white circles */}
      <svg
        className="absolute inset-0 h-full w-full bg-[#021a0c]"
        viewBox="0 0 1000 1000"
        // Keep aspect ratio so the circle stays a circle.
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* Background (everything else should be green) */}
        <rect x="0" y="0" width="1000" height="1000" className="fill-transparent" />

        {/* White circle on the right: adjust cx/cy/r to reposition/resize */}
        <circle cx="800" cy="300" r="400" className="fill-primary-white-1" />
        <circle cx="800" cy="750" r="340" className="fill-primary-white-1" />
        <circle cx="266" cy="826" r="350" className="fill-[#2f7513]" />
       
      </svg>
    </div>
  );
}
