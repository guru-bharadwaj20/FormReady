import { transferables, type Envelope, type Reply, type WorkerError } from './protocol.js';

export class WorkerRequestError extends Error {
  constructor(public readonly info: WorkerError) {
    super(info.detail ?? info.key);
    this.name = 'WorkerRequestError';
  }
}

/** Minimal surface shared by Worker and test doubles. */
export interface MessagePort {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', fn: (ev: { data: unknown }) => void): void;
  addEventListener(type: 'error', fn: (ev: unknown) => void): void;
  terminate?(): void;
}

/**
 * Promise-based request/response over postMessage with monotonic ids.
 * Large buffers are transferred, not copied; the caller must not reuse them.
 */
export class WorkerClient<Req, Res> {
  private next = 1;
  private pending = new Map<number, { resolve: (v: Res) => void; reject: (e: Error) => void }>();

  constructor(private readonly port: MessagePort) {
    port.addEventListener('message', (ev) => this.onMessage(ev.data as Reply<Res>));
    port.addEventListener('error', () => this.failAll(new Error('worker crashed')));
  }

  request(payload: Req): Promise<Res> {
    const id = this.next++;
    const envelope: Envelope<Req> = { id, payload };
    return new Promise<Res>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.port.postMessage(envelope, transferables(payload));
    });
  }

  get inflight(): number {
    return this.pending.size;
  }

  terminate(): void {
    this.port.terminate?.();
    this.failAll(new Error('worker terminated'));
  }

  private onMessage(reply: Reply<Res>): void {
    const p = this.pending.get(reply.id);
    if (!p) return;
    this.pending.delete(reply.id);
    if (reply.ok) p.resolve(reply.payload);
    else p.reject(new WorkerRequestError(reply.error));
  }

  private failAll(err: Error): void {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}

/** Worker-side loop: runs a handler per envelope and posts a Reply. */
export function serve<Req, Res>(
  scope: {
    addEventListener: MessagePort['addEventListener'];
    postMessage: MessagePort['postMessage'];
  },
  handle: (req: Req) => Promise<Res>,
  toError: (e: unknown) => WorkerError,
): void {
  scope.addEventListener('message', async (ev) => {
    const { id, payload } = ev.data as Envelope<Req>;
    let reply: Reply<Res>;
    try {
      reply = { id, ok: true, payload: await handle(payload) };
    } catch (e) {
      reply = { id, ok: false, error: toError(e) };
    }
    scope.postMessage(reply, reply.ok ? transferables(reply.payload) : []);
  });
}
