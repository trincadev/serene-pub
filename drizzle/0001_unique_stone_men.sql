ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'hamlindigo' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dark_mode" boolean DEFAULT true NOT NULL;