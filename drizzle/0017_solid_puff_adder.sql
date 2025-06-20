ALTER TABLE `character_lore_entries` ADD `character_binding_id` integer REFERENCES lorebook_bindings(id);--> statement-breakpoint
ALTER TABLE `character_lore_entries` DROP COLUMN `character_binding`;