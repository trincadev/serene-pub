import { type Handle } from '@sveltejs/kit';
import { loadSocketsServer } from './lib/server/sockets/loadSockets.server';

loadSocketsServer();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
