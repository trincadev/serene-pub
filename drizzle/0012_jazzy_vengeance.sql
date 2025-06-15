PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_personas` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`is_default` integer DEFAULT false,
	`avatar` text,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`position` integer DEFAULT 0,
	`connections` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_personas`("id", "user_id", "is_default", "avatar", "name", "description", "position", "connections", "created_at", "updated_at") SELECT "id", "user_id", "is_default", "avatar", "name", "description", "position", "connections", "created_at", "updated_at" FROM `personas`;--> statement-breakpoint
DROP TABLE `personas`;--> statement-breakpoint
ALTER TABLE `__new_personas` RENAME TO `personas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;