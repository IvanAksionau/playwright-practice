import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalize, sep } from 'node:path';

/**
 * WHERE: transport helpers for the practice server.
 * WHY: Status codes and cookies are the contract. Keeping read/write here
 * stops the route handlers from hand-rolling JSON in every branch.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    // A reload test must hit the server. A cached GET would show the old page
    // and the test would still pass after a broken save.
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(json),
  });
  res.end(json);
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > 1_000_000) throw new HttpError(413, 'payload too large');
    chunks.push(buffer);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'invalid json');
  }
}

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Media elements request byte ranges. A server that only answers 200 can leave
 * the element at readyState 0, and a playback test waits forever for "playing".
 */
export async function serveFile(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  contentType: string,
): Promise<void> {
  const data = await readFile(filePath);
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': data.length,
      'accept-ranges': 'bytes',
    });
    res.end(data);
    return;
  }

  const match = /bytes=(\d+)-(\d*)/.exec(range);
  if (!match?.[1]) {
    res.writeHead(416, { 'content-range': `bytes */${data.length}` });
    res.end();
    return;
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : data.length - 1;
  if (start > end || end >= data.length) {
    res.writeHead(416, { 'content-range': `bytes */${data.length}` });
    res.end();
    return;
  }
  const slice = data.subarray(start, end + 1);
  res.writeHead(206, {
    'content-type': contentType,
    'content-length': slice.length,
    'content-range': `bytes ${start}-${end}/${data.length}`,
    'accept-ranges': 'bytes',
  });
  res.end(slice);
}

export function isInside(root: string, candidate: string): boolean {
  const full = normalize(candidate);
  return full === root || full.startsWith(root + sep);
}
