/**
 * Advisory face framing check (FR-5, ADR-0006). Uses the platform
 * FaceDetector where present (Chromium on Android, desktop Chrome with the
 * flag). Everywhere else it reports "not checked" rather than guessing.
 */

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceMeasure {
  /** Face height divided by image height. */
  heightFraction: number;
  /** Centre of the face as a fraction of width and height, for crop focus. */
  focus: { x: number; y: number };
  box: FaceBox;
}

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
}
interface FaceDetectorLike {
  detect(image: ImageBitmapSource): Promise<DetectedFace[]>;
}
type FaceDetectorCtor = new (opts?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorLike;

export function faceDetectionSupported(): boolean {
  return typeof (globalThis as { FaceDetector?: unknown }).FaceDetector === 'function';
}

/** Pure part: turns the largest box into the measure the validator wants. */
export function measureFromBoxes(
  boxes: FaceBox[],
  width: number,
  height: number,
): FaceMeasure | undefined {
  const box = boxes.reduce<FaceBox | undefined>(
    (best, b) => (!best || b.width * b.height > best.width * best.height ? b : best),
    undefined,
  );
  if (!box || width <= 0 || height <= 0) return undefined;
  return {
    heightFraction: round3(box.height / height),
    focus: {
      x: clamp01((box.x + box.width / 2) / width),
      // Bias slightly above the face centre so crops keep headroom.
      y: clamp01((box.y + box.height * 0.4) / height),
    },
    box,
  };
}

/**
 * Detects the dominant face in an image blob. Returns undefined when the
 * API is missing, throws nothing: an advisory check must never break the
 * flow.
 */
export async function detectFace(blob: Blob): Promise<FaceMeasure | undefined> {
  if (!faceDetectionSupported()) return undefined;
  try {
    const Ctor = (globalThis as unknown as { FaceDetector: FaceDetectorCtor }).FaceDetector;
    const detector = new Ctor({ fastMode: false, maxDetectedFaces: 3 });
    const bitmap = await createImageBitmap(blob);
    try {
      const faces = await detector.detect(bitmap);
      return measureFromBoxes(
        faces.map((f) => f.boundingBox),
        bitmap.width,
        bitmap.height,
      );
    } finally {
      bitmap.close();
    }
  } catch {
    return undefined;
  }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
