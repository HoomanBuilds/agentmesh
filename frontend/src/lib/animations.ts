import { Variants } from "framer-motion";

/**
 * Shared Framer Motion animation variants
 * Use these across the app for consistent animations
 */

// Fade in with upward movement
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Larger fade up
export const fadeInUpLarge: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

// Stagger container 
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// Slide in from left
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
};

// Slide in from right  
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
};

// Scale in 
export const scaleIn: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
};

// Simple fade
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

// Default transition settings
export const defaultTransition = {
  duration: 0.5,
};

export const quickTransition = {
  duration: 0.4,
};

export const slowTransition = {
  duration: 0.6,
};
