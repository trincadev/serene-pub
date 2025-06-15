PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_characters` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`character_version` text DEFAULT '1.0',
	`description` text NOT NULL,
	`personality` text,
	`scenario` text,
	`first_message` text,
	`alternate_greetings` text DEFAULT '[]',
	`example_dialogues` text,
	`metadata` text,
	`avatar` text,
	`creator_notes` text,
	`creator_notes_multilingual` text DEFAULT '{}',
	`group_only_greetings` text DEFAULT '[]',
	`post_history_instructions` text,
	`source` text DEFAULT '[]',
	`assets` text DEFAULT '[]',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text,
	`lorebook_id` integer,
	`extensions` text DEFAULT '[]',
	`is_favorite` integer DEFAULT false,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_characters`("id", "user_id", "name", "nickname", "character_version", "description", "personality", "scenario", "first_message", "alternate_greetings", "example_dialogues", "metadata", "avatar", "creator_notes", "creator_notes_multilingual", "group_only_greetings", "post_history_instructions", "source", "assets", "created_at", "updated_at", "lorebook_id", "extensions", "is_favorite") SELECT "id", "user_id", "name", "nickname", "character_version", "description", "personality", "scenario", "first_message", "alternate_greetings", "example_dialogues", "metadata", "avatar", "creator_notes", "creator_notes_multilingual", "group_only_greetings", "post_history_instructions", "source", "assets", "created_at", "updated_at", "lorebook_id", "extensions", "is_favorite" FROM `characters`;--> statement-breakpoint
DROP TABLE `characters`;--> statement-breakpoint
ALTER TABLE `__new_characters` RENAME TO `characters`;--> statement-breakpoint
PRAGMA foreign_keys=ON;