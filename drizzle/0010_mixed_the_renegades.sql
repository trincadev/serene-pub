PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_prompt_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_immutable` integer DEFAULT true,
	`name` text NOT NULL,
	`system_prompt` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_prompt_configs`("id", "is_immutable", "name", "system_prompt") SELECT "id", "is_immutable", "name", "system_prompt" FROM `prompt_configs`;--> statement-breakpoint
DROP TABLE `prompt_configs`;--> statement-breakpoint
ALTER TABLE `__new_prompt_configs` RENAME TO `prompt_configs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;