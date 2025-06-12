import dotenv from 'dotenv';
import os from 'os';
import * as skio from 'sveltekit-io';
import { connectSockets } from '$lib/server/sockets/index';

dotenv.config();

function getSocketsHttpMode() {
  const SOCKETS_USE_HTTPS = process.env.SOCKETS_HTTP_MODE;
  return SOCKETS_USE_HTTPS && parseInt(SOCKETS_USE_HTTPS) ? 'https' : 'http';
}

function getSocketsHostIP() {
  const SOCKETS_HOST = process.env.SOCKETS_HOST;
  if (SOCKETS_HOST) return SOCKETS_HOST;

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

function getSocketsPort() {
  return process.env.SOCKETS_PORT || '3001';
}

export async function loadSocketsServer() {
  const host = `${getSocketsHttpMode()}://${getSocketsHostIP()}:${getSocketsPort()}`;
  process.env.PUBLIC_SOCKETS_ENDPOINT = host;

  const io = await skio.setup(host, {
    cors: { origin: '*', credentials: false },
    maxHttpBufferSize: 1e8
  });

  if (typeof io.to !== 'function') {
    io.to = () => ({ emit: () => {} });
  }

  connectSockets(io);
  if (process.env.NODE_ENV !== "production") console.log('Socket server ready at', host);
}
