/**
 * Type contract for the portal specification registry (FR-1).
 * Every JSON file under specs/<portal>/<form>.json must conform to this shape;
 * specs/schema.json is the machine-checked twin of these types.
 */

export type AssetKind = 'photo' | 'signature' | 'document' | 'thumb' | 'other';

export type ImageFormat = 'jpeg' | 'png' | 'pdf';

export type ColourMode = 'colour' | 'greyscale' | 'any';

export interface SizeRule {
  /** Minimum file size in bytes (inclusive). Omit when there is no lower bound. */
  minBytes?: number;
  /** Maximum file size in bytes (inclusive). */
  maxBytes: number;
}

export interface PixelRule {
  width: number;
  height: number;
  /** Allowed relative deviation from the target, e.g. 0.05 = +/- 5 %. Default 0. */
  tolerance?: number;
}

export interface PhysicalRule {
  /** Width in millimetres. */
  widthMm: number;
  /** Height in millimetres. */
  heightMm: number;
  /** Dots per inch used to turn millimetres into pixels. */
  dpi: number;
}

export interface AspectRule {
  /** width / height */
  ratio: number;
  /** Allowed relative deviation, default 0.03. */
  tolerance?: number;
}

export interface FaceRule {
  /** Face height as a fraction of image height, inclusive range. */
  minHeightFraction: number;
  maxHeightFraction: number;
}

export interface BackgroundRule {
  /** 'light' means plain white/light background; 'any' disables the check. */
  kind: 'light' | 'white' | 'any';
}

export interface PdfRule {
  maxPages?: number;
  minPages?: number;
  /** ISO page size the portal expects, e.g. 'A4'. Advisory. */
  pageSize?: 'A4' | 'Letter' | 'any';
}

export interface AssetSpec {
  /** Stable id within the spec, e.g. "photo", "signature", "class10-certificate". */
  id: string;
  kind: AssetKind;
  /** Human label shown in the UI (English; translated by key where available). */
  label: string;
  /** Accepted output formats, first is the default output. */
  formats: ImageFormat[];
  size: SizeRule;
  pixels?: PixelRule;
  physical?: PhysicalRule;
  aspect?: AspectRule;
  /** Required DPI tag in the output file, if the portal checks it. */
  dpi?: number;
  colour?: ColourMode;
  face?: FaceRule;
  background?: BackgroundRule;
  pdf?: PdfRule;
  /** Free-text notes from the notification, shown under the checklist. */
  notes?: string[];
}

export interface PortalSpec {
  /** Schema version of this document. */
  $schema?: string;
  /** Unique id, "<portal>/<form>", mirrors the file path. */
  id: string;
  /** Short portal name, e.g. "SSC". */
  portal: string;
  /** Full portal name, e.g. "Staff Selection Commission". */
  portalFullName: string;
  /** Form or exam name, e.g. "CGL 2026". */
  form: string;
  /** Country code, ISO 3166-1 alpha-2. */
  country: string;
  /** Category used for grouping in the UI. */
  category: 'exam' | 'government' | 'banking' | 'visa' | 'education' | 'other';
  /** Search aliases: "ssc cgl", "combined graduate level". */
  aliases: string[];
  /** Official notification or guideline URL the rules were read from. */
  sourceUrl: string;
  /** ISO date (YYYY-MM-DD) the rules were last checked against the source. */
  lastVerified: string;
  /** Optional window the form is usually open, for ordering. */
  season?: string;
  assets: AssetSpec[];
}
