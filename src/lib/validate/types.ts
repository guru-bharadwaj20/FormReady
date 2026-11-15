export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export type CheckId =
  | 'format'
  | 'size'
  | 'pixels'
  | 'physical'
  | 'aspect'
  | 'dpi'
  | 'colour'
  | 'face'
  | 'background'
  | 'pages';

export interface CheckResult {
  id: CheckId;
  status: CheckStatus;
  /** True for checks that may never block download (FR-2.4). */
  advisory: boolean;
  /** Human-readable observed value, e.g. "62 KB". */
  observed: string;
  /** Human-readable expected value, e.g. "20 KB to 50 KB". */
  expected: string;
  /** i18n key for the plain-language explanation. */
  messageKey: string;
  /** Values interpolated into the message. */
  params?: Record<string, string | number>;
}

export interface Report {
  checks: CheckResult[];
  /** True when every non-advisory check passed. */
  compliant: boolean;
  /** Count of advisory warnings. */
  warnings: number;
}
