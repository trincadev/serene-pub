PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chat_characters` (
	`chat_id` integer NOT NULL,
	`character_id` integer,
	`position` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_chat_characters`("chat_id", "character_id", "position", "is_active") SELECT "chat_id", "character_id", "position", "is_active" FROM `chat_characters`;--> statement-breakpoint
DROP TABLE `chat_characters`;--> statement-breakpoint
ALTER TABLE `__new_chat_characters` RENAME TO `chat_characters`;--> statement-breakpoint
--> statement-breakpoint
CREATE TABLE `__new_chats` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`is_group` integer DEFAULT false,
	`user_id` integer NOT NULL,
	`created_at` text,
	`updated_at` text,
	`scenario` text,
	`metadata` text,
	`group_reply_strategy` text DEFAULT 'ordered',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chats`("id", "name", "is_group", "user_id", "created_at", "updated_at", "scenario", "metadata", "group_reply_strategy") SELECT "id", "name", "is_group", "user_id", "created_at", "updated_at", "scenario", "metadata", "group_reply_strategy" FROM `chats`;--> statement-breakpoint
DROP TABLE `chats`;--> statement-breakpoint
ALTER TABLE `__new_chats` RENAME TO `chats`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;