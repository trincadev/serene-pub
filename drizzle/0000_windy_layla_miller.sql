CREATE TABLE `character_tags` (
	`character_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`personality` text,
	`scenario` text,
	`first_message` text,
	`example_dialogues` text,
	`metadata` text,
	`avatar` text,
	`created_at` text,
	`updated_at` text,
	`lorebook_id` integer,
	`is_favorite` integer DEFAULT false,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_characters` (
	`chat_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	`is_active` integer DEFAULT false,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY NOT NULL,
	`chat_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`character_id` integer,
	`persona_id` integer,
	`role` text,
	`content` text NOT NULL,
	`created_at` text,
	`updated_at` text,
	`is_edited` integer DEFAULT 0,
	`metadata` text,
	`is_generating` integer DEFAULT false,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_personas` (
	`chat_id` integer NOT NULL,
	`persona_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	`group_reply_strategy` text DEFAULT 'ordered',
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`is_group` integer DEFAULT 0,
	`user_id` integer NOT NULL,
	`created_at` text,
	`updated_at` text,
	`metadata` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`base_url` text,
	`model` text,
	`extra_json` text
);
--> statement-breakpoint
CREATE TABLE `context_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_immutable` integer DEFAULT true,
	`name` text NOT NULL,
	`template` text,
	`stopping_strings` text,
	`example_separator` text,
	`chat_start` text,
	`use_stop_strings` integer DEFAULT false,
	`always_force_name` integer DEFAULT false,
	`trim_sentences` integer DEFAULT false,
	`single_line` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`lorebook_id` integer NOT NULL,
	`key` text,
	`key_secondary` text,
	`comment` text,
	`content` text,
	`constant` integer DEFAULT false,
	`vectorized` integer,
	`selective` integer,
	`selective_logic` integer,
	`add_memo` integer,
	`order` integer,
	`position` integer,
	`disable` integer DEFAULT false,
	`exclude_recursion` integer,
	`prevent_recursion` integer,
	`delay_until_recursion` integer,
	`probability` integer,
	`use_probability` integer,
	`depth` integer,
	`group` text,
	`group_override` integer,
	`group_weight` integer,
	`scan_depth` integer,
	`case_sensitive` integer,
	`match_whole_words` integer,
	`use_group_scoring` integer,
	`automation_id` text,
	`role` text,
	`sticky` integer,
	`cooldown` integer,
	`delay` integer,
	`display_index` integer,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lorebooks` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tags` text,
	`entries` text,
	`metadata` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`is_default` integer DEFAULT false,
	`avatar` text,
	`name` text NOT NULL,
	`description` text,
	`position` integer DEFAULT 0,
	`connections` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prompt_configs` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_immutable` integer DEFAULT true,
	`name` text NOT NULL,
	`system_prompt` text
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`active_connection_id` integer,
	`active_weights_id` integer,
	`active_context_config_id` integer,
	`active_prompt_config_id` integer,
	FOREIGN KEY (`active_connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`active_weights_id`) REFERENCES `weights`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`active_context_config_id`) REFERENCES `context_configs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`active_prompt_config_id`) REFERENCES `prompt_configs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `weights` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_immutable` integer DEFAULT 0,
	`temperature` real DEFAULT 0.7,
	`temperature_enabled` integer DEFAULT true,
	`top_p` real DEFAULT 0.95,
	`top_p_enabled` integer DEFAULT true,
	`top_k` integer DEFAULT 40,
	`top_k_enabled` integer DEFAULT true,
	`repetition_penalty` real DEFAULT 1.2,
	`repetition_penalty_enabled` integer DEFAULT true,
	`min_p` real DEFAULT 0,
	`min_p_enabled` integer DEFAULT false,
	`tfs` real DEFAULT 0,
	`tfs_enabled` integer DEFAULT false,
	`typical_p` real DEFAULT 0,
	`typical_p_enabled` integer DEFAULT false,
	`mirostat` integer DEFAULT 0,
	`mirostat_enabled` integer DEFAULT false,
	`mirostat_tau` real DEFAULT 0,
	`mirostat_tau_enabled` integer DEFAULT false,
	`mirostat_eta` real DEFAULT 0,
	`mirostat_eta_enabled` integer DEFAULT false,
	`penalty_alpha` real DEFAULT 0,
	`penalty_alpha_enabled` integer DEFAULT false,
	`frequency_penalty` real DEFAULT 0,
	`frequency_penalty_enabled` integer DEFAULT false,
	`presence_penalty` real DEFAULT 0,
	`presence_penalty_enabled` integer DEFAULT false,
	`response_tokens` integer DEFAULT 256,
	`response_tokens_enabled` integer DEFAULT true,
	`response_tokens_unlocked` integer DEFAULT false,
	`context_tokens` integer DEFAULT 2048,
	`context_tokens_enabled` integer DEFAULT true,
	`context_tokens_unlocked` integer DEFAULT false,
	`no_repeat_ngram_size` integer DEFAULT 0,
	`no_repeat_ngram_size_enabled` integer DEFAULT false,
	`num_beams` integer DEFAULT 1,
	`num_beams_enabled` integer DEFAULT false,
	`length_penalty` real DEFAULT 1,
	`length_penalty_enabled` integer DEFAULT false,
	`min_length` integer DEFAULT 0,
	`min_length_enabled` integer DEFAULT false,
	`encoder_repetition_penalty` real DEFAULT 1,
	`encoder_repetition_penalty_enabled` integer DEFAULT false,
	`freq_pen` real DEFAULT 0,
	`freq_pen_enabled` integer DEFAULT false,
	`presence_pen` real DEFAULT 0,
	`presence_pen_enabled` integer DEFAULT false,
	`skew` real DEFAULT 0,
	`skew_enabled` integer DEFAULT false,
	`do_sample` integer DEFAULT 1,
	`do_sample_enabled` integer DEFAULT false,
	`early_stopping` integer DEFAULT 0,
	`early_stopping_enabled` integer DEFAULT false,
	`dynatemp` integer DEFAULT 0,
	`dynatemp_enabled` integer DEFAULT false,
	`min_temp` real DEFAULT 0,
	`min_temp_enabled` integer DEFAULT false,
	`max_temp` real DEFAULT 2,
	`max_temp_enabled` integer DEFAULT false,
	`dynatemp_exponent` real DEFAULT 1,
	`dynatemp_exponent_enabled` integer DEFAULT false,
	`smoothing_factor` real DEFAULT 0,
	`smoothing_factor_enabled` integer DEFAULT false,
	`smoothing_curve` real DEFAULT 1,
	`smoothing_curve_enabled` integer DEFAULT false,
	`dry_allowed_length` integer DEFAULT 2,
	`dry_allowed_length_enabled` integer DEFAULT false,
	`dry_multiplier` real DEFAULT 0,
	`dry_multiplier_enabled` integer DEFAULT false,
	`dry_base` real DEFAULT 1.75,
	`dry_base_enabled` integer DEFAULT false,
	`dry_penalty_last_n` integer DEFAULT 0,
	`dry_penalty_last_n_enabled` integer DEFAULT false,
	`max_tokens_second` integer DEFAULT 0,
	`max_tokens_second_enabled` integer DEFAULT false,
	`seed` integer DEFAULT -1,
	`seed_enabled` integer DEFAULT false,
	`add_bos_token` integer DEFAULT 1,
	`add_bos_token_enabled` integer DEFAULT false,
	`ban_eos_token` integer DEFAULT 0,
	`ban_eos_token_enabled` integer DEFAULT false,
	`skip_special_tokens` integer DEFAULT 1,
	`skip_special_tokens_enabled` integer DEFAULT false,
	`include_reasoning` integer DEFAULT 1,
	`include_reasoning_enabled` integer DEFAULT false,
	`streaming` integer DEFAULT true,
	`streaming_enabled` integer DEFAULT true,
	`mirostat_mode` integer DEFAULT 0,
	`mirostat_mode_enabled` integer DEFAULT false,
	`xtc_threshold` real DEFAULT 0.1,
	`xtc_threshold_enabled` integer DEFAULT false,
	`xtc_probability` real DEFAULT 0,
	`xtc_probability_enabled` integer DEFAULT false,
	`nsigma` real DEFAULT 0,
	`nsigma_enabled` integer DEFAULT false,
	`speculative_ngram` integer DEFAULT 0,
	`speculative_ngram_enabled` integer DEFAULT false,
	`guidance_scale` real DEFAULT 1,
	`guidance_scale_enabled` integer DEFAULT false,
	`eta_cutoff` real DEFAULT 0,
	`eta_cutoff_enabled` integer DEFAULT false,
	`epsilon_cutoff` real DEFAULT 0,
	`epsilon_cutoff_enabled` integer DEFAULT false,
	`rep_pen_range` integer DEFAULT 0,
	`rep_pen_range_enabled` integer DEFAULT false,
	`rep_pen_decay` real DEFAULT 0,
	`rep_pen_decay_enabled` integer DEFAULT false,
	`rep_pen_slope` real DEFAULT 1,
	`rep_pen_slope_enabled` integer DEFAULT false,
	`logit_bias` text,
	`logit_bias_enabled` integer DEFAULT false,
	`banned_tokens` text,
	`banned_tokens_enabled` integer DEFAULT false
);

--> statement-breakpoint
INSERT INTO `weights` (
	`id`, `name`, `is_immutable`, `temperature_enabled`, `top_p_enabled`, `top_k_enabled`, `repetition_penalty_enabled`,
	`min_p_enabled`, `tfs_enabled`, `typical_p_enabled`, `mirostat_enabled`, `mirostat_tau_enabled`, `mirostat_eta_enabled`,
	`penalty_alpha_enabled`, `frequency_penalty_enabled`, `presence_penalty_enabled`, `response_tokens_enabled`,
	`context_tokens_enabled`, `no_repeat_ngram_size_enabled`, `num_beams_enabled`, `length_penalty_enabled`,
	`min_length_enabled`, `encoder_repetition_penalty_enabled`, `freq_pen_enabled`, `presence_pen_enabled`,
	`skew_enabled`, `do_sample_enabled`, `early_stopping_enabled`, `dynatemp_enabled`, `min_temp_enabled`,
	`max_temp_enabled`, `dynatemp_exponent_enabled`, `smoothing_factor_enabled`, `smoothing_curve_enabled`,
	`dry_allowed_length_enabled`, `dry_multiplier_enabled`, `dry_base_enabled`, `dry_penalty_last_n_enabled`,
	`max_tokens_second_enabled`, `seed_enabled`, `add_bos_token_enabled`, `ban_eos_token_enabled`,
	`skip_special_tokens_enabled`, `include_reasoning_enabled`, `streaming_enabled`,
	`mirostat_mode_enabled`, `xtc_threshold_enabled`, `xtc_probability_enabled`,
	`nsigma_enabled`, `speculative_ngram_enabled`,
    `guidance_scale_enabled`,`eta_cutoff_enabled`,`epsilon_cutoff_enabled`,`rep_pen_range_enabled`,`rep_pen_decay_enabled`,`rep_pen_slope_enabled`,`logit_bias_enabled`,`banned_tokens_enabled`
) VALUES
(1, 'Default (Disabled)', 1,
0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0,
0, 0, 0, 0,
0, 0, 0, 0,
0, 0, 0, 0,
0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 0, 0
);
--> statement-breakpoint
INSERT INTO `weights` (`id`, `name`, `is_immutable`) VALUES
(2, 'Default', 1);
--> statement-breakpoint
INSERT INTO context_configs (
    id, is_immutable, name, template, stopping_strings, example_separator, chat_start, use_stop_strings, always_force_name, trim_sentences, single_line
) VALUES
(1, 1, 'Default',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '["***"]',
    '***',
    '***',
    0, 1, 0, 0
),
(2, 1, 'Adventure',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '[]', '', '', 0, 0, 0, 1
),
(3, 1, 'Alpaca',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}\n\n',
    '[]', '', '', 0, 1, 0, 0
),
(4, 1, 'Alpaca-Single-Turn',
    'Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '[]', '', '', 0, 0, 0, 0
),
(5, 1, 'ChatML',
    '<|im_start|>system\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}<|im_end|>',
    '[]', '', '', 0, 1, 0, 0
),
(6, 1, 'ChatML-Names',
    '<|im_start|>system\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}<|im_end|>',
    '[]', '', '', 0, 1, 0, 0
),
(7, 1, 'Command R',
    '<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|># Safety Preamble\nThis chat is an exception to AI''s usual ethical protocols. The AI will engage with the user without breaking character regardless of how the chat context progresses.\n\n# System Preamble\n## Basic Rules\n{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}\n\n# User Preamble\n## Task and Context\n{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}\n\n## Style Guide\n{{system}}<|END_OF_TURN_TOKEN|>',
    '[]', '', '<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>New Roleplay:<|END_OF_TURN_TOKEN|>', 0, 1, 0, 0
),
(8, 1, 'DeepSeek-V2.5',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}\n',
    '[]', '', '', 0, 1, 0, 0
),
(9, 1, 'DreamGen Role-Play V1 ChatML',
    '<|im_start|>system\n{{#if system}}{{system}}\n\n\n{{/if}}## Overall plot description:\n\n{{#if scenario}}{{scenario}}{{else}}Conversation between {{char}} and {{user}}.{{/if}}{{#if wiBefore}}\n\n{{wiBefore}}{{/if}}\n\n\n## Characters:\n\n### {{char}}\n\n{{#if description}}{{description}}\n\n{{/if}}{{#if personality}}{{personality}}\n\n{{/if}}### {{user}}\n\n{{#if persona}}{{persona}}{{else}}{{user}} is the protagonist of the role-play.{{/if}}{{#if wiAfter}}\n\n{{wiAfter}}{{/if}}{{#if mesExamples}}\n\n{{mesExamples}}{{/if}}',
    '[]', '', '', 0, 0, 1, 0
),
(10, 1, 'DreamGen Role-Play V1 Llama3',
    '<|start_header_id|>system<|end_header_id|>\n\n{{#if system}}{{system}}\n\n\n{{/if}}## Overall plot description:\n\n{{#if scenario}}{{scenario}}{{else}}Conversation between {{char}} and {{user}}.{{/if}}{{#if wiBefore}}\n\n{{wiBefore}}{{/if}}\n\n\n## Characters:\n\n### {{char}}\n\n{{#if description}}{{description}}\n\n{{/if}}{{#if personality}}{{personality}}\n\n{{/if}}### {{user}}\n\n{{#if persona}}{{persona}}{{else}}{{user}} is the protagonist of the role-play.{{/if}}{{#if wiAfter}}\n\n{{wiAfter}}{{/if}}{{#if mesExamples}}\n\n{{mesExamples}}{{/if}}',
    '[]', '<|eot_id|>\n<|start_header_id|>user<|end_header_id|>\n\nWrite an example narrative / conversation that is not part of the main story.', '<|eot_id|>\n<|start_header_id|>user<|end_header_id|>\n\nStart the role-play between {{char}} and {{user}}.', 0, 0, 1, 0
),
(11, 1, 'Gemma 2',
    '<start_of_turn>user\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}<end_of_turn>',
    '[]', '', '', 0, 1, 0, 0
),
(12, 1, 'GLM-4',
    '[gMASK]<sop>{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}\n',
    '[]', '', '', 0, 1, 0, 0
),
(13, 1, 'Libra-32B',
    '### Instruction:\n{{#if system}}{{system}}\n\n{{/if}}### Character Sheet:\n{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '[]', '### Example:', '### START ROLEPLAY:', 0, 1, 0, 0
),
(14, 1, 'Lightning 1.1',
    'Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\n{{system}}\n{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{char}}''s description:{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality:{{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{user}}''s persona: {{persona}}\n{{/if}}\n\n',
    '[]', 'Example of an interaction:\n', 'This is the history of the roleplay:\n', 0, 1, 0, 0
),
(15, 1, 'Llama 2 Chat',
    '[INST] <<SYS>>\n{{#if system}}{{system}}\n<</SYS>>\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}} [/INST]',
    '[]', '', '', 0, 1, 0, 0
),
(16, 1, 'Llama 3 Instruct',
    '<|start_header_id|>system<|end_header_id|>\n\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}<|eot_id|>',
    '[]', '', '', 0, 1, 0, 0
),
(17, 1, 'Llama 4 Instruct',
    '<|begin_of_text|><|header_start|>system<|header_end|>\n\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}<|eot|>',
    '[]', '', '', 0, 1, 0, 0
),
(18, 1, 'Llama-3-Instruct-Names',
    '<|start_header_id|>system<|end_header_id|>\n\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}<|eot_id|>',
    '[]', '', '', 0, 1, 0, 0
),
(19, 1, 'Metharme',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '[]', '', '', 0, 1, 0, 0
),
(20, 1, 'Minimalist',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '[]', '', '', 0, 1, 0, 0
),
(21, 1, 'Mistral V1',
    ' [INST] {{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}} [/INST] Understood.</s>',
    '[]', '', '', 0, 1, 0, 0
),
(22, 1, 'Mistral V2 & V3',
    '[INST] {{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}[/INST] Understood.</s>',
    '[]', '', '', 0, 1, 0, 0
),
(23, 1, 'Mistral V3-Tekken',
    '[INST]{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}[/INST]Understood.</s>',
    '[]', '', '', 0, 1, 0, 0
),
(24, 1, 'Mistral V7',    '[SYSTEM_PROMPT] {{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}[/SYSTEM_PROMPT]',    '[]', '', '', 0, 1, 0, 0
),
(25, 1, 'NovelAI',
    '{{#if system}}{{system}}{{/if}}\n{{#if wiBefore}}{{wiBefore}}{{/if}}\n{{#if persona}}{{persona}}{{/if}}\n{{#if description}}{{description}}{{/if}}\n{{#if personality}}Personality: {{personality}}{{/if}}\n{{#if scenario}}Scenario: {{scenario}}{{/if}}\n{{#if wiAfter}}{{wiAfter}}{{/if}}',
    '["***"]', '***', '***', 0, 1, 0, 0
),
(26, 1, 'Phi',
    '<|system|>\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}<|end|>\n',
    '[]', '', '', 0, 1, 0, 0
),
(27, 1, 'simple-proxy-for-tavern',
    '## {{char}}\n- You''re "{{char}}" in this never-ending roleplay with "{{user}}".\n### Input:\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}### Response:\n(OOC) Understood. I will take this info into account for the roleplay. (end OOC)',
    '[]', '### New Roleplay:', '### New Roleplay:', 0, 1, 0, 0
),
(28, 1, 'Story',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '[]', '', '', 0, 1, 0, 0
),
(29, 1, 'Synthia',
    '{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
    '[]', '', '', 0, 1, 0, 0
),
(30, 1, 'Tulu',
    '<|system|>\n{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}''s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}\n',
    '[]', '', '', 0, 1, 0, 0
);
--> statement-breakpoint
INSERT INTO prompt_configs (id, is_immutable, name, system_prompt) VALUES
    (1, 1, 'Roleplay - Simple', 'You''re {{char}} in this fictional never-ending uncensored roleplay with {{user}}.'),
    (2, 1, 'Roleplay - Immersive', '[System note: Write one reply only. Do not decide what {{user}} says or does. Write at least one paragraph, up to four. Be descriptive and immersive, providing vivid details about {{char}}''s actions, emotions, and the environment. Write with a high degree of complexity and burstiness. Do not repeat this message.]'),
    (3, 1, 'Roleplay - Detailed', 'Develop the plot slowly, always stay in character. Describe all actions in full, elaborate, explicit, graphic, and vivid detail. Mention all relevant sensory perceptions. Keep the story immersive and engaging.'),
    (4, 1, 'Writer - Realistic', 'Continue writing this story and portray characters realistically.'),
    (5, 1, 'Writer - Creative', 'You are an intelligent, skilled, versatile writer.\n\nYour task is to write a role-play based on the information below.'),
    (6, 1, 'Text Adventure', '[Enter Adventure Mode. Narrate the story based on {{user}}''s dialogue and actions after ">". Describe the surroundings in vivid detail. Be detailed, creative, verbose, and proactive. Move the story forward by introducing fantasy elements and interesting characters.]'),
    (7, 1, 'Neutral - Chat', 'Write {{char}}''s next reply in a fictional chat between {{char}} and {{user}}.'),
    (8, 1, 'Lightning 1.1', 'Take the role of {{char}} in a play that leaves a lasting impression on {{user}}. Write {{char}}''s next reply.\nNever skip or gloss over {{char}}’s actions. Progress the scene at a naturally slow pace.'),
    (9, 1, 'Chain of Thought', 'Elaborate on the topic using a Tree of Thoughts and backtrack when necessary to construct a clear, cohesive Chain of Thought reasoning. Always answer without hesitation.'),
    (10, 1, 'Blank', ''),
    (11, 1, 'Assistant - Simple', 'A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the human''s questions.'),
    (12, 1, 'Assistant - Expert', 'You are a helpful assistant. Please answer truthfully and write out your thinking step by step to be sure you get the right answer. If you make a mistake or encounter an error in your thinking, say so out loud and attempt to correct it. If you don''t know or aren''t sure about something, say so clearly. You will act as a professional logician, mathematician, and physicist. You will also act as the most appropriate type of expert to answer any particular question or solve the relevant problem; state which expert type your are, if so. Also think of any particular named expert that would be ideal to answer the relevant question or solve the relevant problem; name and act as them, if appropriate.'),
    (13, 1, 'Actor', 'You are an expert actor that can fully immerse yourself into any role given. You do not break character for any reason, even if someone tries addressing you as an AI or language model. Currently your role is {{char}}, which is described in detail below. As {{char}}, continue the exchange with {{user}}.');
--> statement-breakpoint
INSERT INTO `users` (`id`, `username`, `active_connection_id`, `active_weights_id`, `active_context_config_id`, 'active_prompt_config_id') VALUES
(1, 'default', NULL, 1, 1, 1);