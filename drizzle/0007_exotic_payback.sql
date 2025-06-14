PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chat_characters` (
	`chat_id` integer NOT NULL,
	`character_id` integer,
	`position` integer DEFAULT 0,
	`is_active` integer DEFAULT false,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_chat_characters`("chat_id", "character_id", "position", "is_active") SELECT "chat_id", "character_id", "position", "is_active" FROM `chat_characters`;--> statement-breakpoint
DROP TABLE `chat_characters`;--> statement-breakpoint
ALTER TABLE `__new_chat_characters` RENAME TO `chat_characters`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_chat_personas` (
	`chat_id` integer NOT NULL,
	`persona_id` integer,
	`position` integer DEFAULT 0,
	`group_reply_strategy` text DEFAULT 'ordered',
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_chat_personas`("chat_id", "persona_id", "position", "group_reply_strategy") SELECT "chat_id", "persona_id", "position", "group_reply_strategy" FROM `chat_personas`;--> statement-breakpoint
DROP TABLE `chat_personas`;--> statement-breakpoint
ALTER TABLE `__new_chat_personas` RENAME TO `chat_personas`;