import { browser } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import { loadSockets } from "./loadSockets";

await loadSockets();

export const handle: Handle = async ({ event, resolve }) => {
  if (!browser) {
    console.log("New request:", event.request.url);
  }
  return await resolve(event);
};