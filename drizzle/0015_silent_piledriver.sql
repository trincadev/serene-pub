CREATE TABLE `lorebook_bindings` (
	`id` integer PRIMARY KEY NOT NULL,
	`lorebook_id` integer NOT NULL,
	`character_id` integer,
	`persona_id` integer,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lorebook_bindings_unique` ON `lorebook_bindings` (`lorebook_id`,`character_id`,`persona_id`);--> statement-breakpoint
ALTER TABLE `lorebooks` DROP COLUMN `character_bindings`;