export interface AuthHeroImageProps {
    /** Image URL (Cloudinary/remote ok per next.config) */
    src?: string;
    /** Accessible alt text */
    alt?: string;
    /** Next/Image sizes hint */
    sizes?: string;
    /** Preload on first paint */
    priority?: boolean;
    /** Optional wrapper className */
    className?: string;
    /** Apply rounded corners to the container */
    rounded?: boolean;
  }