import type { ImgHTMLAttributes } from 'react'

interface PictureProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  /** Base path without extension, e.g. `/food/loaded-fries`. */
  src: string
  /** Intrinsic size of the large variant, used to reserve layout space. */
  width: number
  height: number
  alt: string
  /** Set when a `-sm` variant exists (cards). Hero/feature only ship one size. */
  responsive?: boolean
  sizes?: string
  priority?: boolean
}

/**
 * AVIF-first picture with WebP fallback. Dimensions are always reserved so
 * images never shift layout while loading.
 */
export function Picture({
  src,
  width,
  height,
  alt,
  responsive = false,
  sizes,
  priority = false,
  className,
  ...rest
}: PictureProps) {
  const avif = responsive ? `${src}-sm.avif 480w, ${src}.avif ${width}w` : undefined
  const webp = responsive ? `${src}-sm.webp 480w, ${src}.webp ${width}w` : undefined
  return (
    <picture>
      <source type="image/avif" srcSet={avif ?? `${src}.avif`} sizes={responsive ? sizes : undefined} />
      <source type="image/webp" srcSet={webp ?? `${src}.webp`} sizes={responsive ? sizes : undefined} />
      <img
        src={`${src}.webp`}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={className}
        {...rest}
      />
    </picture>
  )
}
