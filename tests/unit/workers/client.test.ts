import { describe, expect, it } from 'vitest';
import { WorkerClient, WorkerRequestError, serve, type MessagePort } from '$workers/client';
import { toWorkerError } from '$workers/errors';
import { transferables } from '$workers/protocol';
import { UnsupportedFormatError } from '$lib/codec/types';
import { InvalidPdfError, SizeUnreachableError } from '$lib/pdf';

/** Two in-memory ports wired together, like a Worker and its global scope. */
function pair(): [MessagePort, MessagePort] {
  const a: ((ev: { data: unknown }) => void)[] = [];
  const b: ((ev: { data: unknown }) => void)[] = [];
  const make = (mine: typeof a, theirs: typeof b): MessagePort => ({
    postMessage: (m) => queueMicrotask(() => theirs.forEach((fn) => fn({ data: m }))),
    addEventListener: (type: string, fn: (ev: never) => void) => {
      if (type === 'message') mine.push(fn as (ev: { data: unknown }) => void);
    },
  });
  return [make(a, b), make(b, a)];
}

describe('WorkerClient', () => {
  it('matches replies to requests by id and surfaces typed errors', async () => {
    const [main, worker] = pair();
    serve<{ n: number }, number>(
      worker,
      async (req) => {
        if (req.n < 0) throw new RangeError('negative');
        await new Promise((r) => setTimeout(r, 10 - req.n));
        return req.n * 2;
      },
      toWorkerError,
    );
    const client = new WorkerClient<{ n: number }, number>(main);
    const results = Promise.all([client.request({ n: 1 }), client.request({ n: 5 })]);
    expect(client.inflight).toBe(2);
    expect(await results).toEqual([2, 10]);
    const err = await client.request({ n: -1 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkerRequestError);
    expect((err as WorkerRequestError).info.key).toBe('error.sizeUnreachable');
    expect(client.inflight).toBe(0);
  });
  it('rejects everything in flight on terminate', async () => {
    const [main] = pair();
    const client = new WorkerClient<unknown, unknown>(main);
    const p = client.request({});
    client.terminate();
    await expect(p).rejects.toThrow(/terminated/);
  });
});

describe('toWorkerError', () => {
  it('maps known failures to message keys', () => {
    expect(toWorkerError(new UnsupportedFormatError('heic')).key).toBe('drop.unsupported');
    expect(toWorkerError(new InvalidPdfError()).key).toBe('error.invalidPdf');
    const big = toWorkerError(new SizeUnreachableError(300 * 1024, 200 * 1024));
    expect(big).toMatchObject({
      key: 'pdf.unreachable',
      params: { limit: '200 KB', best: '300 KB' },
    });
    expect(toWorkerError(new TypeError('x')).key).toBe('error.decode');
    expect(toWorkerError('boom').key).toBe('error.generic');
  });
});

describe('transferables', () => {
  it('collects distinct buffers from nested payloads', () => {
    const buf = new Uint8Array(4);
    const list = transferables({ a: buf, b: [buf, new Uint8Array(2)], c: { d: 'x' } });
    expect(list).toHaveLength(2);
    expect(list[0]).toBe(buf.buffer);
  });
});
