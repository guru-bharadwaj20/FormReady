/**
 * Observed facts about a file, produced by the image or PDF worker and
 * consumed by the pure validator (FR-2.1). Everything here is measured, never
 * guessed; unknown values are left undefined so the validator can mark the
 * check as "skip" rather than fail.
 */

export type DetectedFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'heic' | 'pdf' | 'unknown';

export interface FileFacts {
  format: DetectedFormat;
  bytes: number;
  /** Pixel dimensions for images; undefined for PDFs. */
  width?: number;
  height?: number;
  /** DPI read from JFIF/EXIF/pHYs if present. */
  dpi?: number;
  /** True when every pixel has R == G == B. */
  greyscale?: boolean;
  /** Face height as a fraction of image height, if a face check ran. */
  faceHeightFraction?: number;
  /** 0..1, higher means plainer/lighter border region. */
  backgroundPlainness?: number;
  /** Mean lightness 0..1 of the border region. */
  backgroundLightness?: number;
  /** Which advisory checks were actually run on this device. */
  faceChecked?: boolean;
  /** PDF only. */
  pages?: number;
}
