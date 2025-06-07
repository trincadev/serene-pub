COMMIT TRANSACTION;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
BEGIN TRANSACTION;--> statement-breakpoint
CREATE TABLE `__new_character_tags` (
	`character_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_character_tags`("character_id", "tag_id") SELECT "character_id", "tag_id" FROM `character_tags`;--> statement-breakpoint
DROP TABLE `character_tags`;--> statement-breakpoint
ALTER TABLE `__new_character_tags` RENAME TO `character_tags`;--> statement-breakpoint
CREATE TABLE `__new_characters` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`personality` text,
	`scenario` text,
	`first_message` text,
	`example_dialogues` text,
	`metadata` text,
	`avatar` text,
	`created_at` text,
	`updated_at` text,
	`lorebook_id` integer,
	`is_favorite` integer DEFAULT false,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_characters`("id", "user_id", "name", "description", "personality", "scenario", "first_message", "example_dialogues", "metadata", "avatar", "created_at", "updated_at", "lorebook_id", "is_favorite") SELECT "id", "user_id", "name", "description", "personality", "scenario", "first_message", "example_dialogues", "metadata", "avatar", "created_at", "updated_at", "lorebook_id", "is_favorite" FROM `characters`;--> statement-breakpoint
DROP TABLE `characters`;--> statement-breakpoint
ALTER TABLE `__new_characters` RENAME TO `characters`;--> statement-breakpoint
CREATE TABLE `__new_chat_characters` (
	`chat_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	`is_active` integer DEFAULT false,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chat_characters`("chat_id", "character_id", "position", "is_active") SELECT "chat_id", "character_id", "position", "is_active" FROM `chat_characters`;--> statement-breakpoint
DROP TABLE `chat_characters`;--> statement-breakpoint
ALTER TABLE `__new_chat_characters` RENAME TO `chat_characters`;--> statement-breakpoint
CREATE TABLE `__new_chat_messages` (
	`id` integer PRIMARY KEY NOT NULL,
	`chat_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`character_id` integer,
	`persona_id` integer,
	`role` text,
	`content` text NOT NULL,
	`created_at` text,
	`updated_at` text,
	`is_edited` integer DEFAULT 0,
	`metadata` text,
	`is_generating` integer DEFAULT false,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_chat_messages`("id", "chat_id", "user_id", "character_id", "persona_id", "role", "content", "created_at", "updated_at", "is_edited", "metadata", "is_generating") SELECT "id", "chat_id", "user_id", "character_id", "persona_id", "role", "content", "created_at", "updated_at", "is_edited", "metadata", "is_generating" FROM `chat_messages`;--> statement-breakpoint
DROP TABLE `chat_messages`;--> statement-breakpoint
ALTER TABLE `__new_chat_messages` RENAME TO `chat_messages`;--> statement-breakpoint
CREATE TABLE `__new_chat_personas` (
	`chat_id` integer NOT NULL,
	`persona_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	`group_reply_strategy` text DEFAULT 'ordered',
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chat_personas`("chat_id", "persona_id", "position", "group_reply_strategy") SELECT "chat_id", "persona_id", "position", "group_reply_strategy" FROM `chat_personas`;--> statement-breakpoint
DROP TABLE `chat_personas`;--> statement-breakpoint
ALTER TABLE `__new_chat_personas` RENAME TO `chat_personas`;--> statement-breakpoint
CREATE TABLE `__new_chats` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`is_group` integer DEFAULT 0,
	`user_id` integer NOT NULL,
	`created_at` text,
	`updated_at` text,
	`metadata` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chats`("id", "name", "is_group", "user_id", "created_at", "updated_at", "metadata") SELECT "id", "name", "is_group", "user_id", "created_at", "updated_at", "metadata" FROM `chats`;--> statement-breakpoint
DROP TABLE `chats`;--> statement-breakpoint
ALTER TABLE `__new_chats` RENAME TO `chats`;--> statement-breakpoint
CREATE TABLE `__new_lorebook_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`lorebook_id` integer NOT NULL,
	`key` text,
	`key_secondary` text,
	`comment` text,
	`content` text,
	`constant` integer DEFAULT false,
	`vectorized` integer,
	`selective` integer,
	`selective_logic` integer,
	`add_memo` integer,
	`order` integer,
	`position` integer,
	`disable` integer DEFAULT false,
	`exclude_recursion` integer,
	`prevent_recursion` integer,
	`delay_until_recursion` integer,
	`probability` integer,
	`use_probability` integer,
	`depth` integer,
	`group` text,
	`group_override` integer,
	`group_weight` integer,
	`scan_depth` integer,
	`case_sensitive` integer,
	`match_whole_words` integer,
	`use_group_scoring` integer,
	`automation_id` text,
	`role` text,
	`sticky` integer,
	`cooldown` integer,
	`delay` integer,
	`display_index` integer,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lorebook_entries`("id", "lorebook_id", "key", "key_secondary", "comment", "content", "constant", "vectorized", "selective", "selective_logic", "add_memo", "order", "position", "disable", "exclude_recursion", "prevent_recursion", "delay_until_recursion", "probability", "use_probability", "depth", "group", "group_override", "group_weight", "scan_depth", "case_sensitive", "match_whole_words", "use_group_scoring", "automation_id", "role", "sticky", "cooldown", "delay", "display_index") SELECT "id", "lorebook_id", "key", "key_secondary", "comment", "content", "constant", "vectorized", "selective", "selective_logic", "add_memo", "order", "position", "disable", "exclude_recursion", "prevent_recursion", "delay_until_recursion", "probability", "use_probability", "depth", "group", "group_override", "group_weight", "scan_depth", "case_sensitive", "match_whole_words", "use_group_scoring", "automation_id", "role", "sticky", "cooldown", "delay", "display_index" FROM `lorebook_entries`;--> statement-breakpoint
DROP TABLE `lorebook_entries`;--> statement-breakpoint
ALTER TABLE `__new_lorebook_entries` RENAME TO `lorebook_entries`;--> statement-breakpoint
CREATE TABLE `__new_lorebooks` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tags` text,
	`entries` text,
	`metadata` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lorebooks`("id", "user_id", "name", "description", "tags", "entries", "metadata", "created_at", "updated_at") SELECT "id", "user_id", "name", "description", "tags", "entries", "metadata", "created_at", "updated_at" FROM `lorebooks`;--> statement-breakpoint
DROP TABLE `lorebooks`;--> statement-breakpoint
ALTER TABLE `__new_lorebooks` RENAME TO `lorebooks`;--> statement-breakpoint
CREATE TABLE `__new_personas` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`is_default` integer DEFAULT false,
	`avatar` text,
	`name` text NOT NULL,
	`description` text,
	`position` integer DEFAULT 0,
	`connections` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_personas`("id", "user_id", "is_default", "avatar", "name", "description", "position", "connections", "created_at", "updated_at") SELECT "id", "user_id", "is_default", "avatar", "name", "description", "position", "connections", "created_at", "updated_at" FROM `personas`;--> statement-breakpoint
DROP TABLE `personas`;--> statement-breakpoint
ALTER TABLE `__new_personas` RENAME TO `personas`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;