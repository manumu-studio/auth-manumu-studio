'use client';

import Image from 'next/image';
import type { AuthHeroImageProps } from './AuthHeroImage.types';
import styles from './AuthHeroImage.module.scss';

const DEFAULT_SRC =
  'https://res.cloudinary.com/dugudxkyu/image/upload/v1676643038/7fbac6523f58c558f3f2329469aa5594_hmabe1.jpg';

export default function AuthHeroImage({
  src = DEFAULT_SRC,
  alt = 'Authentication illustration',
  sizes = '(min-width: 860px) 40vw, 100vw',
  priority = true,
  className,
  rounded = true,
}: AuthHeroImageProps) {
  return (
    <div
      className={[
        styles.root,
        rounded ? styles.rounded : '',
        className ?? '',
      ].join(' ')}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={styles.img}
        style={{ objectFit: 'cover' }}
        priority={priority}
      />
    </div>
  );
}