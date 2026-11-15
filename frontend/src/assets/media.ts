import heroAstronautEarth from './images/hero_astronaut_earth_1794652286622.jpg';
import aboutMarsHorizon from './images/about_mars_horizon_1794652288516.jpg';
import moonSurface from './images/moon_surface_target_1794651486407.jpg';
import marsSurface from './images/mars_surface_target_1794651487862.jpg';
import targetMoonLavatube from './images/target_moon_lavatube_1794652604252.jpg';
import targetMoonSouthpole from './images/target_moon_southpole_1794652614642.jpg';
import targetMarsJezero from './images/target_mars_jezero_1794652604962.jpg';
import polarIce from './images/analog_polar_ice_1794651487900.jpg';
import roverTesting from './images/rover_field_testing_1794652606449.jpg';
import brandEmblem from './images/astranovus_emblem.png';
import type { TargetId } from '../types/astranovus';

export const MEDIA = {
  heroAstronautEarth,
  aboutMarsHorizon,
  moonSurface,
  marsSurface,
  roverTesting,
  brandEmblem,
} as const;

/** Illustrative imagery per planetary reference site (not data, not a measurement). */
export function getTargetImage(targetId: TargetId): string {
  switch (targetId) {
    case 'MOON_LAVATUBE':
      return targetMoonLavatube;
    case 'MOON_SP_RIDGE':
    case 'MOON_PSR':
      return targetMoonSouthpole;
    case 'MOON_MARE':
      return moonSurface;
    case 'MARS_JEZERO':
      return targetMarsJezero;
    case 'MARS_ICE':
      return polarIce;
    default:
      return marsSurface;
  }
}
