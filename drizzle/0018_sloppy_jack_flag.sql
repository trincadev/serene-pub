PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_world_lore_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`lorebook_id` integer NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`keys` text DEFAULT '[]' NOT NULL,
	`use_regex` integer DEFAULT false,
	`case_sensitive` integer DEFAULT false NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`constant` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`extra_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_world_lore_entries`("id", "lorebook_id", "name", "category", "keys", "use_regex", "case_sensitive", "content", "priority", "constant", "enabled", "extra_json", "created_at", "updated_at", "position") SELECT "id", "lorebook_id", "name", "category", "keys", "use_regex", "case_sensitive", "content", "priority", "constant", "enabled", "extra_json", "created_at", "updated_at", "position" FROM `world_lore_entries`;--> statement-breakpoint
DROP TABLE `world_lore_entries`;--> statement-breakpoint
ALTER TABLE `__new_world_lore_entries` RENAME TO `world_lore_entries`;--> statement-breakpoint
CREATE UNIQUE INDEX `worldLoreEntries_lorebookId_position_unique` ON `world_lore_entries` (`lorebook_id`,`position`);--> statement-breakpoint
PRAGMA foreign_keys=ON;