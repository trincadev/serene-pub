import { updated } from '$app/state';
import { relations } from 'drizzle-orm';
import { sqliteTable, integer, text, numeric, real, blob, SQLiteBoolean } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: integer('id').primaryKey(),
    username: text('username').notNull(),
    activeConnectionId: integer('active_connection_id').references(() => connections.id),
    activeWeightsId: integer('active_weights_id').references(() => weights.id),
    activeContextConfigId: integer('active_context_config_id').references(() => contextConfigs.id),
    activePromptConfigId: integer('active_prompt_config_id').references(() => promptConfigs.id),
})

export const userRelations = relations(users, ({ many, one }) => ({
    lorebooks: many(lorebooks),
    characters: many(characters),
    activeWeights: one(weights, {
        fields: [users.activeWeightsId],
        references: [weights.id]
    }),
    activeConnection: one(connections, {
        fields: [users.activeConnectionId],
        references: [connections.id]
    }),
    activeContextConfig: one(contextConfigs, {
        fields: [users.activeContextConfigId],
        references: [contextConfigs.id]
    }),
    activePromptConfig: one(promptConfigs, {
        fields: [users.activePromptConfigId],
        references: [promptConfigs.id]
    }),
    personas: many(personas),
}))

export const weights = sqliteTable('weights', {
    id: integer('id').primaryKey(),
	name: text('name').notNull(), // Name for this weights config (for selection)
	isImmutable: integer('is_immutable', {mode: 'boolean'}).default(0), // Is this the built-in config? Then we don't want to allow mutation/deletion
    // Common LLM options (enabled by default)
    temperature: real('temperature').default(0.7),
    temperatureEnabled: integer('temperature_enabled', {mode: 'boolean'}).default(true),
    topP: real('top_p').default(0.95),
    topPEnabled: integer('top_p_enabled', {mode: 'boolean'}).default(true),
    topK: integer('top_k').default(40),
    topKEnabled: integer('top_k_enabled', {mode: 'boolean'}).default(true),
    repetitionPenalty: real('repetition_penalty').default(1.2),
    repetitionPenaltyEnabled: integer('repetition_penalty_enabled', {mode: 'boolean'}).default(true),
    // Less common options (disabled by default)
    minP: real('min_p').default(0),
    minPEnabled: integer('min_p_enabled', {mode: 'boolean'}).default(false),
    tfs: real('tfs').default(0),
    tfsEnabled: integer('tfs_enabled', {mode: 'boolean'}).default(false),
    typicalP: real('typical_p').default(0),
    typicalPEnabled: integer('typical_p_enabled', {mode: 'boolean'}).default(false),
    mirostat: integer('mirostat').default(0),
    mirostatEnabled: integer('mirostat_enabled', {mode: 'boolean'}).default(false),
    mirostatTau: real('mirostat_tau').default(0),
    mirostatTauEnabled: integer('mirostat_tau_enabled', {mode: 'boolean'}).default(false),
    mirostatEta: real('mirostat_eta').default(0),
    mirostatEtaEnabled: integer('mirostat_eta_enabled', {mode: 'boolean'}).default(false),
    penaltyAlpha: real('penalty_alpha').default(0),
    penaltyAlphaEnabled: integer('penalty_alpha_enabled', {mode: 'boolean'}).default(false),
    frequencyPenalty: real('frequency_penalty').default(0),
    frequencyPenaltyEnabled: integer('frequency_penalty_enabled', {mode: 'boolean'}).default(false),
    presencePenalty: real('presence_penalty').default(0),
    presencePenaltyEnabled: integer('presence_penalty_enabled', {mode: 'boolean'}).default(false),
    responseTokens: integer('response_tokens').default(256),
    responseTokensEnabled: integer('response_tokens_enabled', {mode: 'boolean'}).default(true),
    responseTokensUnlocked: integer('response_tokens_unlocked', {mode: 'boolean'}).default(false), // Is this response tokens unlocked? (e.g. for dynamic response)
    contextTokens: integer('context_tokens').default(2048),
    contextTokensEnabled: integer('context_tokens_enabled', {mode: 'boolean'}).default(true),
	contextTokensUnlocked: integer('context_tokens_unlocked', {mode: 'boolean'}).default(false), // Is this context tokens unlocked? (e.g. for dynamic context)
    // Add more as needed for future LLMs
    noRepeatNgramSize: integer('no_repeat_ngram_size').default(0),
    noRepeatNgramSizeEnabled: integer('no_repeat_ngram_size_enabled', {mode: 'boolean'}).default(false),
    numBeams: integer('num_beams').default(1),
    numBeamsEnabled: integer('num_beams_enabled', {mode: 'boolean'}).default(false),
    lengthPenalty: real('length_penalty').default(1),
    lengthPenaltyEnabled: integer('length_penalty_enabled', {mode: 'boolean'}).default(false),
    minLength: integer('min_length').default(0),
    minLengthEnabled: integer('min_length_enabled', {mode: 'boolean'}).default(false),
    encoderRepetitionPenalty: real('encoder_repetition_penalty').default(1),
    encoderRepetitionPenaltyEnabled: integer('encoder_repetition_penalty_enabled', {mode: 'boolean'}).default(false),
    freqPen: real('freq_pen').default(0),
    freqPenEnabled: integer('freq_pen_enabled', {mode: 'boolean'}).default(false),
    presencePen: real('presence_pen').default(0),
    presencePenEnabled: integer('presence_pen_enabled', {mode: 'boolean'}).default(false),
    skew: real('skew').default(0),
    skewEnabled: integer('skew_enabled', {mode: 'boolean'}).default(false),
    doSample: integer('do_sample').default(1),
    doSampleEnabled: integer('do_sample_enabled', {mode: 'boolean'}).default(false),
    earlyStopping: integer('early_stopping').default(0),
    earlyStoppingEnabled: integer('early_stopping_enabled', {mode: 'boolean'}).default(false),
    dynatemp: integer('dynatemp').default(0),
    dynatempEnabled: integer('dynatemp_enabled', {mode: 'boolean'}).default(false),
    minTemp: real('min_temp').default(0),
    minTempEnabled: integer('min_temp_enabled', {mode: 'boolean'}).default(false),
    maxTemp: real('max_temp').default(2.0),
    maxTempEnabled: integer('max_temp_enabled', {mode: 'boolean'}).default(false),
    dynatempExponent: real('dynatemp_exponent').default(1.0),
    dynatempExponentEnabled: integer('dynatemp_exponent_enabled', {mode: 'boolean'}).default(false),
    smoothingFactor: real('smoothing_factor').default(0),
    smoothingFactorEnabled: integer('smoothing_factor_enabled', {mode: 'boolean'}).default(false),
    smoothingCurve: real('smoothing_curve').default(1),
    smoothingCurveEnabled: integer('smoothing_curve_enabled', {mode: 'boolean'}).default(false),
    dryAllowedLength: integer('dry_allowed_length').default(2),
    dryAllowedLengthEnabled: integer('dry_allowed_length_enabled', {mode: 'boolean'}).default(false),
    dryMultiplier: real('dry_multiplier').default(0),
    dryMultiplierEnabled: integer('dry_multiplier_enabled', {mode: 'boolean'}).default(false),
    dryBase: real('dry_base').default(1.75),
    dryBaseEnabled: integer('dry_base_enabled', {mode: 'boolean'}).default(false),
    dryPenaltyLastN: integer('dry_penalty_last_n').default(0),
    dryPenaltyLastNEnabled: integer('dry_penalty_last_n_enabled', {mode: 'boolean'}).default(false),
    maxTokensSecond: integer('max_tokens_second').default(0),
    maxTokensSecondEnabled: integer('max_tokens_second_enabled', {mode: 'boolean'}).default(false),
    seed: integer('seed').default(-1),
    seedEnabled: integer('seed_enabled', {mode: 'boolean'}).default(false),
    addBosToken: integer('add_bos_token').default(1),
    addBosTokenEnabled: integer('add_bos_token_enabled', {mode: 'boolean'}).default(false),
    banEosToken: integer('ban_eos_token').default(0),
    banEosTokenEnabled: integer('ban_eos_token_enabled', {mode: 'boolean'}).default(false),
    skipSpecialTokens: integer('skip_special_tokens').default(1),
    skipSpecialTokensEnabled: integer('skip_special_tokens_enabled', {mode: 'boolean'}).default(false),
    includeReasoning: integer('include_reasoning').default(1),
    includeReasoningEnabled: integer('include_reasoning_enabled', {mode: 'boolean'}).default(false),
    streaming: integer('streaming', {mode: 'boolean'}).default(true),
    streamingEnabled: integer('streaming_enabled', {mode: 'boolean'}).default(true),
    mirostatMode: integer('mirostat_mode').default(0),
    mirostatModeEnabled: integer('mirostat_mode_enabled', {mode: 'boolean'}).default(false),
    xtcThreshold: real('xtc_threshold').default(0.1),
    xtcThresholdEnabled: integer('xtc_threshold_enabled', {mode: 'boolean'}).default(false),
    xtcProbability: real('xtc_probability').default(0),
    xtcProbabilityEnabled: integer('xtc_probability_enabled', {mode: 'boolean'}).default(false),
    nsigma: real('nsigma').default(0),
    nsigmaEnabled: integer('nsigma_enabled', {mode: 'boolean'}).default(false),
    speculativeNgram: integer('speculative_ngram').default(0),
    speculativeNgramEnabled: integer('speculative_ngram_enabled', {mode: 'boolean'}).default(false),
    guidanceScale: real('guidance_scale').default(1),
    guidanceScaleEnabled: integer('guidance_scale_enabled', {mode: 'boolean'}).default(false),
    etaCutoff: real('eta_cutoff').default(0),
    etaCutoffEnabled: integer('eta_cutoff_enabled', {mode: 'boolean'}).default(false),
    epsilonCutoff: real('epsilon_cutoff').default(0),
    epsilonCutoffEnabled: integer('epsilon_cutoff_enabled', {mode: 'boolean'}).default(false),
    repPenRange: integer('rep_pen_range').default(0),
    repPenRangeEnabled: integer('rep_pen_range_enabled', {mode: 'boolean'}).default(false),
    repPenDecay: real('rep_pen_decay').default(0),
    repPenDecayEnabled: integer('rep_pen_decay_enabled', {mode: 'boolean'}).default(false),
    repPenSlope: real('rep_pen_slope').default(1),
    repPenSlopeEnabled: integer('rep_pen_slope_enabled', {mode: 'boolean'}).default(false),
    logitBias: text('logit_bias'),
    logitBiasEnabled: integer('logit_bias_enabled', {mode: 'boolean'}).default(false),
    bannedTokens: text('banned_tokens'),
    bannedTokensEnabled: integer('banned_tokens_enabled', {mode: 'boolean'}).default(false),
})

export const weightsRelations = relations(weights, () => ({}))

export const connections = sqliteTable('connections', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(), // Connection name (e.g., ollama, llama, chatgpt)
    type: text('type').notNull(), // Connection type/category (e.g., ollama, chatgpt, etc)
    baseUrl: text('base_url'), // Base URL or endpoint for API
    model: text('model'), // Model name or identifier
    // Ollama-specific options
    extraJson: text('extra_json'), // Additional JSON options for the connections, api keys, etc.
})

export const connectionsRelations = relations(connections, () => ({}))

export const contextConfigs = sqliteTable('context_configs', {
    id: integer('id').primaryKey(),
    isImmutable: integer('is_immutable', {mode: "boolean"}).default(true),
    name: text('name').notNull(),
    template: text('template'), // Sillytavern storyString
    chatStart: text('chat_start'), // Chat start string
    alwaysForceName: integer('always_force_name', {mode: 'boolean'}).default(true), // Always force name2
    // trimSentences: integer('trim_sentences', {mode: 'boolean'}).default(false), // Trim sentences
    // singleLine: integer('single_line', {mode: 'boolean'}).default(false), // Single line mode
    format: text('format').default('chatml'), // Prompt format (chatml, alpaca, openai, etc)
})

export const contextConfigsRelations = relations(contextConfigs, () => ({}))

export const promptConfigs = sqliteTable('prompt_configs', {
    id: integer('id').primaryKey(),
    isImmutable: integer('is_immutable', {mode: "boolean"}).default(true),
    name: text('name').notNull(),
    systemPrompt: text('system_prompt'), // Maps to sillytavern sysPrompt.content
})

export const promptConfigsRelations = relations(promptConfigs, () => ({}))

export const lorebooks = sqliteTable('lorebooks', {
    id: integer('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}), // FK to users.id
    name: text('name').notNull(), // Lorebook name
    description: text('description'), // Lorebook description
    tags: text('tags'), // JSON array of tags
    entries: text('entries'), // JSON array of lorebook entries (for compatibility with SillyTavern)
    metadata: text('metadata'), // JSON object for any extra SillyTavern/world/lorebook fields
    createdAt: text('created_at'), // ISO date string
    updatedAt: text('updated_at'), // ISO date string
})

export const lorebooksRelations = relations(lorebooks, ({ many, one }) => ({
    entries: many(lorebookEntries),
    user: one(users, {
        fields: [lorebooks.userId],
        references: [users.id]
    })
}))

export const lorebookEntries = sqliteTable('lorebook_entries', {
    id: integer('id').primaryKey(),
    lorebookId: integer('lorebook_id').notNull().references(() => lorebooks.id, {onDelete: 'cascade'}), // FK to lorebooks.id
    key: text('key'), // JSON array of keys
    keySecondary: text('key_secondary'), // JSON array of secondary keys
    comment: text('comment'),
    content: text('content'),
    constant: integer('constant', {mode: "boolean"}).default(false), // Is this entry a constant value?
    vectorized: integer('vectorized'),
    selective: integer('selective'),
    selectiveLogic: integer('selective_logic'),
    addMemo: integer('add_memo'),
    order: integer('order'),
    position: integer('position'),
    disable: integer('disable', {mode: "boolean"}).default(false), // Is this entry disabled?
    excludeRecursion: integer('exclude_recursion'),
    preventRecursion: integer('prevent_recursion'),
    delayUntilRecursion: integer('delay_until_recursion'),
    probability: integer('probability'),
    useProbability: integer('use_probability'),
    depth: integer('depth'),
    group: text('group'),
    groupOverride: integer('group_override'),
    groupWeight: integer('group_weight'),
    scanDepth: integer('scan_depth'),
    caseSensitive: integer('case_sensitive'),
    matchWholeWords: integer('match_whole_words'),
    useGroupScoring: integer('use_group_scoring'),
    automationId: text('automation_id'),
    role: text('role'),
    sticky: integer('sticky'),
    cooldown: integer('cooldown'),
    delay: integer('delay'),
    displayIndex: integer('display_index'),
})

export const lorebookEntriesRelations = relations(lorebookEntries, ({ one }) => ({
    lorebook: one(lorebooks, {
        fields: [lorebookEntries.lorebookId],
        references: [lorebooks.id]
    })
}))

export const tags = sqliteTable('tags', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(), // Tag name (unique)
    description: text('description'),
})

export const tagsRelations = relations(tags, ({ many }) => ({
    characterTags: many(characterTags)
}))

export const characterTags = sqliteTable('character_tags', {
    characterId: integer('character_id').notNull().references(() => characters.id, {onDelete: 'cascade'}), // FK to characters.id
    tagId: integer('tag_id').notNull().references(() => tags.id, {onDelete: 'cascade'}), // FK to tags.id
})

export const characterTagsRelations = relations(characterTags, ({ one }) => ({
    character: one(characters, {
        fields: [characterTags.characterId],
        references: [characters.id]
    }),
    tag: one(tags, {
        fields: [characterTags.tagId],
        references: [tags.id]
    })
}))

export const characters = sqliteTable('characters', {
    id: integer('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}), // FK to users.id
    name: text('name').notNull(),
    description: text('description'),
    personality: text('personality'), // Persona field
    scenario: text('scenario'),
    firstMessage: text('first_message'),
    exampleDialogues: text('example_dialogues'), // JSON/text
    metadata: text('metadata'), // JSON/text for extra fields
    avatar: text('avatar'), // Path or URL to avatar image
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
	lorebookId: integer('lorebook_id').references(() => lorebooks.id, {onDelete: 'set null'}), // Optional FK to lorebooks.id
	isFavorite: integer('is_favorite', {mode: "boolean"}).default(false), // 1 if favorite, 0 otherwise
})

export const charactersRelations = relations(characters, ({ many, one }) => ({
    characterTags: many(characterTags),
    user: one(users, {
        fields: [characters.userId],
        references: [users.id]
    }),
	lorebook: one(lorebooks, {
		fields: [characters.lorebookId],
		references: [lorebooks.id]
	}),
}))

export const personas = sqliteTable('personas', {
    id: integer('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}), // FK to users.id
	isDefault: integer('is_default', {mode: "boolean"}).default(false), // Is this the default persona for the user?
    avatar: text('avatar'), // e.g. 'user-default.png', '1747379438925-Ryvn.png'
    name: text('name').notNull(), // e.g. 'Warren', 'Master Desir'
    description: text('description'), // Persona description (long text)
    position: integer('position').default(0),
    connections: text('connections'), // JSON array of connection IDs or objects
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
})

export const personasRelations = relations(personas, ({ one, many }) => ({
    user: one(users, {
        fields: [personas.userId],
        references: [users.id]
    }),
}))

// Chats (group or 1:1)
export const chats = sqliteTable('chats', {
    id: integer('id').primaryKey(),
    name: text('name'), // Optional chat/group name
    isGroup: integer('is_group').default(0), // 1 for group chat, 0 for 1:1
    userId: integer('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
    metadata: text('metadata'), // JSON for extra settings
})

export const chatsRelations = relations(chats, ({ one, many }) => ({
    user: one(users, {
        fields: [chats.userId],
        references: [users.id]
    }),
    chatMessages: many(chatMessages),
    chatPersonas: many(chatPersonas),
    chatCharacters: many(chatCharacters),
}))

// Chat messages
export const chatMessages = sqliteTable('chat_messages', {
    id: integer('id').primaryKey(),
    chatId: integer('chat_id').notNull().references(() => chats.id, {onDelete: 'cascade'}),
    userId: integer('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}), // nullable for system/character messages
    characterId: integer('character_id').references(() => characters.id, {onDelete: 'set null'}), // nullable
    personaId: integer('persona_id').references(() => personas.id, {onDelete: 'set null'}), // nullable
    role: text('role'), // 'user', 'character', 'system', etc
    content: text('content').notNull(),
    createdAt: text('created_at'),
	updatedAt: text('updated_at'),
	isEdited: integer('is_edited').default(0), // 1 if edited, 0 otherwise
    metadata: text('metadata'), // JSON for extra info
    isGenerating: integer('is_generating', {mode: "boolean"}).default(false), // 1 if processing, 0 otherwise
})

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    chat: one(chats, {
        fields: [chatMessages.chatId],
        references: [chats.id]
    }),
    user: one(users, {
        fields: [chatMessages.userId],
        references: [users.id]
    }),
    character: one(characters, {
        fields: [chatMessages.characterId],
        references: [characters.id]
    }),
    persona: one(personas, {
        fields: [chatMessages.personaId],
        references: [personas.id]
    }),
}))

export const GroupReplyStrategies = {
	MANUAL: 'manual', // User manually selects persona for each reply
	ORDERED: 'ordered', // Replies follow the order of personas in the chat
	NATURAL: 'natural', // Replies are assigned based on natural conversation flow
}

// Many-to-many: chats <-> personas
export const chatPersonas = sqliteTable('chat_personas', {
    chatId: integer('chat_id').notNull().references(() => chats.id, {onDelete: 'cascade'}),
    personaId: integer('persona_id').notNull().references(() => personas.id, {onDelete: 'cascade'}),
	position: integer('position').default(0), // Position in the chat
	group_reply_strategy: text('group_reply_strategy').default(GroupReplyStrategies.ORDERED), // How to handle group replies
})

export const chatPersonasRelations = relations(chatPersonas, ({ one }) => ({
    chat: one(chats, {
        fields: [chatPersonas.chatId],
        references: [chats.id]
    }),
    persona: one(personas, {
        fields: [chatPersonas.personaId],
        references: [personas.id]
    }),
}))

// Many-to-many: chats <-> characters
export const chatCharacters = sqliteTable('chat_characters', {
    chatId: integer('chat_id').notNull().references(() => chats.id, {onDelete: 'cascade'}),
    characterId: integer('character_id').notNull().references(() => characters.id, {onDelete: 'cascade'}),
	position: integer('position').default(0), // Position in the chat
	isActive: integer('is_active', {mode: "boolean"}).default(false), // 1 if active in chat, 0 if not
})

export const chatCharactersRelations = relations(chatCharacters, ({ one }) => ({
    chat: one(chats, {
        fields: [chatCharacters.chatId],
        references: [chats.id]
    }),
    character: one(characters, {
        fields: [chatCharacters.characterId],
        references: [characters.id]
    }),
}))


