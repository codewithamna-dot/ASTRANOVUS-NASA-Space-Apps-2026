import darkLogo from '../assets/images/astranovus_logo_full.webp';
import lightLogo from '../assets/images/astranovus_logo_nav_light.webp';

interface AstranovusLogoProps {
  /**
   * `nav`: for LIGHT surfaces (navbar). The same artwork on a transparent background, with its white/silver parts shaded navy so they stay readable.
   * `full`: for DARK surfaces (footer, About). The original artwork and colours on a transparent background, with the tagline.
   */
  variant?: 'nav' | 'full';
  className?: string;
}

export function AstranovusLogo({ variant = 'nav', className = '' }: AstranovusLogoProps) {
  const full = variant === 'full';
  return (
    <img
      src={full ? darkLogo : lightLogo}
      alt="ASTRANOVUS: Earth Analog Discovery"
      width={full ? 995 : 980}
      height={full ? 515 : 450}
      decoding="async"
      className={`block select-none ${className || (full ? 'h-24 w-auto' : 'h-[54px] w-auto')}`}
      draggable={false}
    />
  );
}
