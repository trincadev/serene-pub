import { browser } from "$app/environment"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	return await resolve(event)
}
