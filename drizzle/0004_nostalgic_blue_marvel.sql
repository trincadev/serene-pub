ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "color_preset" text DEFAULT 'preset-filled-primary-500' NOT NULL;