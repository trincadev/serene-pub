CREATE TABLE `character_tags` (
	`character_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
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
CREATE TABLE `chat_characters` (
	`chat_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	`is_active` integer DEFAULT false,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
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
CREATE TABLE `chat_personas` (
	`chat_id` integer NOT NULL,
	`persona_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	`group_reply_strategy` text DEFAULT 'ordered',
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chats` (
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
CREATE TABLE `connections` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`base_url` text,
	`model` text,
	`extra_json` text,
	`token_counter` text DEFAULT 'estimate' NOT NULL,
	`prompt_format` text DEFAULT 'vicuna'
);
--> statement-breakpoint
CREATE TABLE `context_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_immutable` integer DEFAULT true,
	`name` text NOT NULL,
	`template` text,
	`always_force_name` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
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
CREATE TABLE `lorebooks` (
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
CREATE TABLE `personas` (
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
CREATE TABLE `prompt_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_immutable` integer DEFAULT true,
	`name` text NOT NULL,
	`system_prompt` text
);
--> statement-breakpoint
CREATE TABLE `sampling_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_immutable` integer DEFAULT 0,
	`temperature` real DEFAULT 0.7,
	`temperature_enabled` integer DEFAULT true,
	`top_p` real DEFAULT 0.92,
	`top_p_enabled` integer DEFAULT true,
	`top_k` integer DEFAULT 80,
	`top_k_enabled` integer DEFAULT true,
	`repetition_penalty` real DEFAULT 1.15,
	`repetition_penalty_enabled` integer DEFAULT true,
	`frequency_penalty` real DEFAULT 0.2,
	`frequency_penalty_enabled` integer DEFAULT true,
	`presence_penalty` real DEFAULT 0.6,
	`presence_penalty_enabled` integer DEFAULT true,
	`response_tokens` integer DEFAULT 512,
	`response_tokens_enabled` integer DEFAULT true,
	`response_tokens_unlocked` integer DEFAULT false,
	`context_tokens` integer DEFAULT 4096,
	`context_tokens_enabled` integer DEFAULT true,
	`context_tokens_unlocked` integer DEFAULT false,
	`seed` integer DEFAULT -1,
	`seed_enabled` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`active_connection_id` integer,
	`active_sampling_id` integer,
	`active_context_config_id` integer,
	`active_prompt_config_id` integer,
	FOREIGN KEY (`active_connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`active_sampling_id`) REFERENCES `sampling_configs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`active_context_config_id`) REFERENCES `context_configs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`active_prompt_config_id`) REFERENCES `prompt_configs`(`id`) ON UPDATE no action ON DELETE set null
);
