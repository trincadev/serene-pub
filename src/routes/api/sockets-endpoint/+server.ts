import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  const endpoint = process.env.PUBLIC_SOCKETS_ENDPOINT || '';
  return new Response(JSON.stringify({ endpoint }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
