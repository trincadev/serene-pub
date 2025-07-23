<script lang="ts">
	import { Avatar } from "@skeletonlabs/skeleton-svelte"
	import * as Icons from "@lucide/svelte"

	interface Props {
		char: Partial<SelectCharacter> | Partial<SelectPersona>
		src?: string
	}

	let { char = $bindable(), src = $bindable() }: Props = $props()
</script>

<Avatar
	src={src ? src : char ? char.avatar || "" : ""}
	size="w-[4em] h-[4em]"
	imageClasses="object-cover"
	name={char
		? "nickname" in char && char.nickname
			? char.nickname
			: char.name!
		: "Unknown"}
>
	<Icons.User size={36} />
</Avatar>
