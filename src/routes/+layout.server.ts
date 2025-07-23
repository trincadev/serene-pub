import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async (event) => {
	return {
		isNewerReleaseAvailable: event.locals.isNewerReleaseAvailable,
		latestReleaseTag: event.locals.latestReleaseTag
	}
}
