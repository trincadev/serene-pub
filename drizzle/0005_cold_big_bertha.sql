ALTER TABLE "system_settings" ADD COLUMN "show_all_character_fields" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "enable_easy_character_creation" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "enable_easy_persona_creation" boolean DEFAULT true NOT NULL;