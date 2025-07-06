import dotenv from 'dotenv';
import os from 'os';
import * as skio from 'sveltekit-io';
import { connectSockets } from '$lib/server/sockets/index';

dotenv.config();

function getSocketsHttpMode() {
  const SOCKETS_USE_HTTPS = process.env.SOCKETS_HTTP_MODE;
  return SOCKETS_USE_HTTPS && parseInt(SOCKETS_USE_HTTPS) ? 'https' : 'http';
}

function getSocketsPort() {
  return process.env.SOCKETS_PORT || '3001';
}

export async function loadSocketsServer() {
  const host = `${getSocketsHttpMode()}://0.0.0.0:${getSocketsPort()}`;
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
