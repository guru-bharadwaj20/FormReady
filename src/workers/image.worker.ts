import { browserCodec } from '../lib/codec/browser.js';
import { fixImage, inspectImage } from '../lib/image/pipeline.js';
import { limitLongEdge } from '../lib/image/resize.js';
import { serve } from './client.js';
import { toWorkerError } from './errors.js';
import type { ImageRequest, ImageResponse } from './protocol.js';

/** Image worker: decode, measure and fix without touching the main thread. */
serve<ImageRequest, ImageResponse>(
  self,
  async (req) => {
    if (req.kind === 'inspect') {
      const { facts, image } = await inspectImage(req.bytes, browserCodec, req.asset);
      // A small JPEG preview keeps the main thread free of large bitmaps.
      const preview = await browserCodec.encodeJpeg(limitLongEdge(image, 600), 80);
      return { kind: 'inspect', facts, preview };
    }
    const r = await fixImage(req.bytes, req.asset, browserCodec, {
      format: req.format,
      focus: req.focus,
    });
    return { kind: 'fix', bytes: r.bytes, facts: r.facts, steps: r.steps, format: r.format };
  },
  toWorkerError,
);
