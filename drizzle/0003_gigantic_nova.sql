-- First, update existing example_dialogues text values to be JSON arrays
UPDATE "characters" 
SET "example_dialogues" = CASE 
    WHEN "example_dialogues" IS NULL OR TRIM("example_dialogues") = '' THEN '[]'
    ELSE (
        SELECT json_agg(TRIM(dialogue))::text
        FROM unnest(string_to_array("example_dialogues", '<START>')) AS dialogue
        WHERE TRIM(dialogue) != ''
    )
END;--> statement-breakpoint

ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET DATA TYPE json USING "example_dialogues"::json;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "example_dialogues" SET NOT NULL;