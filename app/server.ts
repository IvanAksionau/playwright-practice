import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { HttpError, isInside, isRecord, readCookie, readJson, send, serveFile } from './http';
import { store } from './store';
import { apiRoutes, baseURL } from '../shared/config';

/**
 * WHERE: the system under test. In a real job this repo is the product repo,
 * or it is not in the test repo at all. It lives here so the suite runs offline.
 * WHY: Interview tasks need a contract you can break on purpose. Public demo
 * sites change, rate-limit you, and have no idempotency key to assert on.
 */

const publicDir = join(process.cwd(), 'app/public');
const port = Number(new URL(baseURL).port || 80);

const pages: Record<string, string> = {
  '/login': 'login.html',
  '/items': 'items.html',
  '/watch': 'watch.html',
};

const assets: Record<string, string> = {
  '/styles.css': 'text/css; charset=utf-8',
  '/login.js': 'text/javascript; charset=utf-8',
  '/items.js': 'text/javascript; charset=utf-8',
  '/watch.js': 'text/javascript; charset=utf-8',
  '/media/clip.webm': 'video/webm',
};

function requireUser(req: IncomingMessage): string {
  const userId = store.userIdForToken(readCookie(req, 'session'));
  if (!userId) throw new HttpError(401, 'unauthorized');
  return userId;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) throw new HttpError(400, 'invalid idempotency key');
  if (value === undefined) return undefined;
  if (value.length === 0 || value.length > 200) throw new HttpError(400, 'invalid idempotency key');
  return value;
}

function parseName(body: unknown): string {
  if (!isRecord(body) || typeof body.name !== 'string' || body.name.trim() === '') {
    throw new HttpError(400, 'name is required');
  }
  if (body.name.length > 80) throw new HttpError(400, 'name is too long');
  return body.name;
}

function parseExpectedVersion(body: unknown): number | undefined {
  if (!isRecord(body) || !('expectedVersion' in body)) return undefined;
  if (typeof body.expectedVersion !== 'number') throw new HttpError(400, 'expectedVersion must be a number');
  return body.expectedVersion;
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', baseURL);
  const path = url.pathname;
  const method = req.method ?? 'GET';

  if (method === 'GET' && path === apiRoutes.health) {
    send(res, 200, { ok: true });
    return;
  }

  if (method === 'POST' && path === apiRoutes.login) {
    const body = await readJson(req);
    if (!isRecord(body) || typeof body.email !== 'string' || typeof body.password !== 'string') {
      throw new HttpError(400, 'email and password are required');
    }
    const session = store.login(body.email, body.password);
    if (!session) throw new HttpError(401, 'invalid credentials');
    // HttpOnly so page JavaScript cannot read the session. SameSite=Lax is
    // enough for this first-party app. Production over HTTPS also sets Secure.
    // No Secure here: the practice baseURL is http, and a Secure cookie would never be stored.
    res.setHeader('set-cookie', `session=${session.token}; HttpOnly; Path=/; SameSite=Lax`);
    send(res, 200, { id: session.userId, email: session.email });
    return;
  }

  if (method === 'GET' && path === apiRoutes.me) {
    const userId = requireUser(req);
    send(res, 200, { id: userId });
    return;
  }

  if (method === 'GET' && path === apiRoutes.items) {
    send(res, 200, store.listItems(requireUser(req)));
    return;
  }

  if (method === 'POST' && path === apiRoutes.items) {
    const userId = requireUser(req);
    const body = await readJson(req);
    const created = store.createItem(userId, parseName(body), headerValue(req.headers['idempotency-key']));
    if (created.status === 409) {
      send(res, 409, { error: created.error });
      return;
    }
    if (created.replayed) res.setHeader('idempotency-replayed', 'true');
    send(res, 201, created.item);
    return;
  }

  const itemMatch = /^\/api\/items\/([^/]+)$/.exec(path);
  if (itemMatch?.[1]) {
    const id = decodeURIComponent(itemMatch[1]);
    const userId = requireUser(req);

    if (method === 'GET') {
      const found = store.getItem(userId, id);
      if (found.status !== 200) {
        send(res, found.status, { error: found.error });
        return;
      }
      send(res, 200, found.item);
      return;
    }

    if (method === 'PUT') {
      const body = await readJson(req);
      const replaced = store.replaceItem(userId, id, parseName(body), parseExpectedVersion(body));
      if (replaced.status !== 200) {
        send(res, replaced.status, { error: replaced.error });
        return;
      }
      send(res, 200, replaced.item);
      return;
    }
  }

  if (method === 'GET' && path === apiRoutes.manifest) {
    requireUser(req);
    // A streaming client would get an m3u8 URL here. Chromium does not play
    // HLS natively, so the practice manifest points at clip.webm (MDN's CC0
    // flower sample). The test still waits on this response before trusting the player.
    send(res, 200, { src: '/media/clip.webm', type: 'video/webm' });
    return;
  }

  const page = pages[path];
  if (method === 'GET' && page) {
    await serveFile(req, res, join(publicDir, page), 'text/html; charset=utf-8');
    return;
  }

  const assetType = assets[path];
  if (method === 'GET' && assetType) {
    const filePath = join(publicDir, path.slice(1));
    if (!isInside(publicDir, filePath)) {
      send(res, 404, { error: 'not_found' });
      return;
    }
    await serveFile(req, res, filePath, assetType);
    return;
  }

  send(res, 404, { error: 'not_found' });
}

const server = createServer((req, res) => {
  route(req, res).catch((error: unknown) => {
    if (error instanceof HttpError) {
      send(res, error.status, { error: error.message });
      return;
    }
    console.error(error);
    send(res, 500, { error: 'internal' });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`practice app at ${baseURL}`);
});
