import React, { useState } from 'react';

interface OstadGearLogoProps {
  className?: string;
  showText?: boolean;
}

/**
 * OSTAD GEAR Official Monogram Logo (image_6b0fd8cc.png)
 */
export const OstadGearLogo: React.FC<OstadGearLogoProps> = ({ 
  className = "w-9 h-9", 
  showText = false
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-2.5 ${showText ? '' : 'shrink-0'}`}>
      {/* Official Monogram Logo from user's image_6b0fd8cc.png */}
      <div className={`${className} shrink-0 select-none overflow-hidden rounded-xl bg-black flex items-center justify-center`}>
        {!imageError ? (
          <img
            src="/assets/aistudio/image_6b0fd8cc.png"
            alt="OSTAD GEAR Logo"
            className="w-full h-full object-cover rounded-xl"
            onError={() => setImageError(true)}
          />
        ) : (
          <svg
            viewBox="0 0 1000 1000"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full select-none overflow-hidden rounded-xl"
          >
            <rect width="1000" height="1000" fill="#000000" />
            <rect x="175" y="260" width="650" height="480" rx="240" fill="#FFFFFF" />
            <g fill="#000000">
              <path d="M 365 326 C 265 326 237 400 237 500 C 237 600 265 674 365 674 L 423 674 L 423 326 Z" />
              <rect x="466" y="326" width="68" height="348" />
              <path d="M 534 326 L 630 326 C 685 326 730 355 748 412 L 534 412 Z" />
              <rect x="735" y="412" width="100" height="66" />
              <path d="M 574 478 L 762 478 C 752 560 725 674 630 674 L 574 674 Z" />
            </g>
          </svg>
        )}
      </div>

      {/* Stylized Wordmark if showText is requested */}
      {showText && (
        <div className="flex flex-col text-left leading-none">
          <OstadGearWordmark className="h-6 sm:h-7 w-auto" />
          <span className="text-[10px] tracking-[0.18em] text-zinc-400 uppercase font-medium mt-0.5">
            Dhaka Streetwear &amp; Jersey
          </span>
        </div>
      )}
    </div>
  );
};

interface OstadGearWordmarkProps {
  className?: string;
  alt?: string;
}

/**
 * OSTAD GEAR Custom Hand-lettered Wordmark Font (image_4e6e981e.png)
 */
export const OstadGearWordmark: React.FC<OstadGearWordmarkProps> = ({
  className = "h-7 w-auto",
  alt = "OSTAD GEAR"
}) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <span className="text-base sm:text-lg font-black tracking-[0.14em] text-white font-brand">
        OSTAD <span className="text-amber-400">GEAR</span>
      </span>
    );
  }

  return (
    <img
      src="/assets/aistudio/ostad_gear_text.png"
      alt={alt}
      className={`${className} object-contain select-none`}
      onError={() => setImgError(true)}
    />
  );
};
