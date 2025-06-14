ALTER TABLE `chats` ADD `group_reply_strategy` text DEFAULT 'ordered';--> statement-breakpoint
ALTER TABLE `chat_personas` DROP COLUMN `group_reply_strategy`;