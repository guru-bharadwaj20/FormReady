import { describe, expect, it } from 'vitest';
import { detectFace, faceDetectionSupported, measureFromBoxes } from '$lib/face';

describe('face measure', () => {
  it('uses the largest box and biases focus upward', () => {
    const m = measureFromBoxes(
      [
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 100, y: 80, width: 100, height: 120 },
      ],
      300,
      400,
    )!;
    expect(m.heightFraction).toBe(0.3);
    expect(m.focus.x).toBe(0.5);
    expect(m.focus.y).toBeCloseTo((80 + 48) / 400, 5);
    expect(m.box.width).toBe(100);
  });
  it('returns undefined without faces or with a degenerate image', () => {
    expect(measureFromBoxes([], 10, 10)).toBeUndefined();
    expect(measureFromBoxes([{ x: 0, y: 0, width: 1, height: 1 }], 0, 10)).toBeUndefined();
  });
  it('degrades to not-checked when the platform API is missing', async () => {
    expect(faceDetectionSupported()).toBe(false);
    expect(await detectFace(new Blob([new Uint8Array(4)]))).toBeUndefined();
  });
});
