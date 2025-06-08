COMMIT TRANSACTION;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
BEGIN TRANSACTION;--> statement-breakpoint
CREATE TABLE `__new_context_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_immutable` integer DEFAULT true,
	`name` text NOT NULL,
	`template` text,
	`stopping_strings` text DEFAULT '[]',
	`example_separator` text,
	`chat_start` text,
	`use_stop_strings` integer DEFAULT true,
	`always_force_name` integer DEFAULT false,
	`trim_sentences` integer DEFAULT false,
	`single_line` integer DEFAULT false
);
--> statement-breakpoint
INSERT INTO `__new_context_configs`("id", "is_immutable", "name", "template", "stopping_strings", "example_separator", "chat_start", "use_stop_strings", "always_force_name", "trim_sentences", "single_line") SELECT "id", "is_immutable", "name", "template", "stopping_strings", "example_separator", "chat_start", "use_stop_strings", "always_force_name", "trim_sentences", "single_line" FROM `context_configs`;--> statement-breakpoint
DROP TABLE `context_configs`;--> statement-breakpoint
ALTER TABLE `__new_context_configs` RENAME TO `context_configs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;