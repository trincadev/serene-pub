PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `lorebook_entries` RENAME TO `character_lore_entries`;--> statement-breakpoint
ALTER TABLE `character_lore_entries` RENAME COLUMN "key" TO "keys";--> statement-breakpoint
CREATE TABLE `chat_lorebooks` (
	`chat_id` integer NOT NULL,
	`lorebook_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chatLorebooks_chatId_position_unique` ON `chat_lorebooks` (`chat_id`,`position`);--> statement-breakpoint
CREATE TABLE `history_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`lorebook_id` integer NOT NULL,
	`date` text DEFAULT '{"day":1,"month":1,"year":1}' NOT NULL,
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
CREATE UNIQUE INDEX `historyEntries_lorebookId_position_unique` ON `history_entries` (`lorebook_id`,`position`);--> statement-breakpoint
CREATE TABLE `world_lore_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`lorebook_id` integer NOT NULL,
	`name` text,
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
CREATE UNIQUE INDEX `worldLoreEntries_lorebookId_position_unique` ON `world_lore_entries` (`lorebook_id`,`position`);--> statement-breakpoint
CREATE TABLE `__new_character_lore_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`lorebook_id` integer NOT NULL,
	`character_binding` text NOT NULL,
	`name` text,
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
DROP TABLE `character_lore_entries`;--> statement-breakpoint
ALTER TABLE `__new_character_lore_entries` RENAME TO `character_lore_entries`;--> statement-breakpoint
CREATE UNIQUE INDEX `characterLoreEntries_lorebookId_position_unique` ON `character_lore_entries` (`lorebook_id`,`position`);--> statement-breakpoint
CREATE TABLE `__new_lorebooks` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`character_bindings` text DEFAULT '[]' NOT NULL,
	`extra_json` text DEFAULT '{}' NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `lorebooks`;--> statement-breakpoint
ALTER TABLE `__new_lorebooks` RENAME TO `lorebooks`;--> statement-breakpoint
ALTER TABLE `chats` ADD `lorebook_id` integer REFERENCES lorebooks(id);--> statement-breakpoint
PRAGMA foreign_keys=ON;