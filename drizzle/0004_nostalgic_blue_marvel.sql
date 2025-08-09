ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET DATA TYPE json USING 
  CASE 
    WHEN "example_dialogues" IS NULL OR trim("example_dialogues") = '' THEN '[]'::json
    WHEN trim("example_dialogues") ~ '^\[.*\]$' OR trim("example_dialogues") ~ '^\{.*\}$' THEN 
      trim("example_dialogues")::json
    ELSE '[]'::json
  END;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "color_preset" text DEFAULT 'preset-filled-primary-500' NOT NULL;