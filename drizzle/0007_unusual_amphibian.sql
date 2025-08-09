-- Custom SQL migration file, put your code below! --

-- Convert {char:#} to {{char:#}} in lorebook_bindings.binding 
UPDATE lorebook_bindings 
SET binding = REGEXP_REPLACE(binding, '\{char:([0-9]+)\}', '{{char:\1}}', 'g')
WHERE binding ~ '\{char:[0-9]+\}';
--> statement-breakpoint
-- Convert {char:#} to {{char:#}} in content fields
-- Update history_entries.content
UPDATE history_entries 
SET content = REGEXP_REPLACE(content, '\{char:([0-9]+)\}', '{{char:\1}}', 'g')
WHERE content ~ '\{char:[0-9]+\}';
--> statement-breakpoint
-- Update character_lore_entries.content  
UPDATE character_lore_entries 
SET content = REGEXP_REPLACE(content, '\{char:([0-9]+)\}', '{{char:\1}}', 'g')
WHERE content ~ '\{char:[0-9]+\}';
--> statement-breakpoint
-- Update world_lore_entries.content
UPDATE world_lore_entries 
SET content = REGEXP_REPLACE(content, '\{char:([0-9]+)\}', '{{char:\1}}', 'g')
WHERE content ~ '\{char:[0-9]+\}';
--> statement-breakpoint
-- Convert single-brace legacy tags to double-brace
-- Convert {user} to {{user}} in content fields
UPDATE history_entries 
SET content = REGEXP_REPLACE(content, '\{(user|char|persona|character)\}', '{{\1}}', 'g')
WHERE content ~ '\{(user|char|persona|character)\}';
--> statement-breakpoint
-- Update character_lore_entries.content for legacy tags
UPDATE character_lore_entries 
SET content = REGEXP_REPLACE(content, '\{(user|char|persona|character)\}', '{{\1}}', 'g')
WHERE content ~ '\{(user|char|persona|character)\}';
--> statement-breakpoint
-- Update world_lore_entries.content for legacy tags  
UPDATE world_lore_entries 
SET content = REGEXP_REPLACE(content, '\{(user|char|persona|character)\}', '{{\1}}', 'g')
WHERE content ~ '\{(user|char|persona|character)\}';