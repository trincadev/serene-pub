PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sampling_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_immutable` integer DEFAULT false,
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
INSERT INTO `__new_sampling_configs`("id", "name", "is_immutable", "temperature", "temperature_enabled", "top_p", "top_p_enabled", "top_k", "top_k_enabled", "repetition_penalty", "repetition_penalty_enabled", "frequency_penalty", "frequency_penalty_enabled", "presence_penalty", "presence_penalty_enabled", "response_tokens", "response_tokens_enabled", "response_tokens_unlocked", "context_tokens", "context_tokens_enabled", "context_tokens_unlocked", "seed", "seed_enabled") SELECT "id", "name", "is_immutable", "temperature", "temperature_enabled", "top_p", "top_p_enabled", "top_k", "top_k_enabled", "repetition_penalty", "repetition_penalty_enabled", "frequency_penalty", "frequency_penalty_enabled", "presence_penalty", "presence_penalty_enabled", "response_tokens", "response_tokens_enabled", "response_tokens_unlocked", "context_tokens", "context_tokens_enabled", "context_tokens_unlocked", "seed", "seed_enabled" FROM `sampling_configs`;--> statement-breakpoint
DROP TABLE `sampling_configs`;--> statement-breakpoint
ALTER TABLE `__new_sampling_configs` RENAME TO `sampling_configs`;--> statement-breakpoint
ALTER TABLE `history_entries` DROP COLUMN `priority`;--> statement-breakpoint
PRAGMA foreign_keys=ON;