import { updated } from '$app/state';
import { relations } from 'drizzle-orm';
import { sqliteTable, integer, text, numeric, real, blob, SQLiteBoolean } from 'drizzle-orm/sqlite-core';
import { TokenCounterManager } from '../utils/TokenCounterManager';

export const users = sqliteTable('users', {
    id: integer('id').primaryKey(),
    username: text('username').notNull(),
    activeConnectionId: integer('active_connection_id').references(() => connections.id, {onDelete: 'set null'}),
    activeSamplingConfigId: integer('active_sampling_id').references(() => samplingConfigs.id, {onDelete: 'set null'}),
    activeContextConfigId: integer('active_context_config_id').references(() => contextConfigs.id, {onDelete: 'set null'}),
    activePromptConfigId: integer('active_prompt_config_id').references(() => promptConfigs.id, {onDelete: 'set null'}),
})

export const userRelations = relations(users, ({ many, one }) => ({
    lorebooks: many(lorebooks),
    characters: many(characters),
    activeSamplingConfig: one(samplingConfigs, {
        fields: [users.activeSamplingConfigId],
        references: [samplingConfigs.id]
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

export const samplingConfigs = sqliteTable('sampling_configs', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(), // Name for this sampling config (for selection)
    isImmutable: integer('is_immutable', {mode: 'boolean'}).default(0), // Is this the built-in config? Then we don't want to allow mutation/deletion

    // Tuned defaults for roleplay:
    // More creative and less repetitive
    temperature: real('temperature').default(0.7), // Higher = more creative
    temperatureEnabled: integer('temperature_enabled', {mode: 'boolean'}).default(true),

    topP: real('top_p').default(0.92), // Lower than 1, encourages diversity but not too random
    topPEnabled: integer('top_p_enabled', {mode: 'boolean'}).default(true),

    topK: integer('top_k').default(80), // Allows more token options for creative replies
    topKEnabled: integer('top_k_enabled', {mode: 'boolean'}).default(true),

    repetitionPenalty: real('repetition_penalty').default(1.15), // Slightly encourages less repetition but not too harsh
    repetitionPenaltyEnabled: integer('repetition_penalty_enabled', {mode: 'boolean'}).default(true),

    frequencyPenalty: real('frequency_penalty').default(0.2), // Mild penalty for repetitive phrases
    frequencyPenaltyEnabled: integer('frequency_penalty_enabled', {mode: 'boolean'}).default(true),

    presencePenalty: real('presence_penalty').default(0.6), // Encourage new topics and freshness
    presencePenaltyEnabled: integer('presence_penalty_enabled', {mode: 'boolean'}).default(true),

    responseTokens: integer('response_tokens').default(512), // Allow longer, richer replies
    responseTokensEnabled: integer('response_tokens_enabled', {mode: 'boolean'}).default(true),
    responseTokensUnlocked: integer('response_tokens_unlocked', {mode: 'boolean'}).default(false), // Dynamic length allowed

    contextTokens: integer('context_tokens').default(4096), // Keep more conversation in memory/context
    contextTokensEnabled: integer('context_tokens_enabled', {mode: 'boolean'}).default(true),
    contextTokensUnlocked: integer('context_tokens_unlocked', {mode: 'boolean'}).default(false), // Allow for context window expansion

    seed: integer('seed').default(-1), // -1 for random, can be used for deterministic sampling
    seedEnabled: integer('seed_enabled', {mode: 'boolean'}).default(false),
})

export const samplingRelations = relations(samplingConfigs, () => ({}))

export const connections = sqliteTable('connections', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(), // Connection name (e.g., ollama, llama, chatgpt)
    type: text('type').notNull(), // Connection type/category (e.g., ollama, chatgpt, etc)
    baseUrl: text('base_url'), // Base URL or endpoint for API
    model: text('model'), // Model name or identifier
    // Ollama-specific options
    extraJson: text('extra_json', { mode: 'json' }).$type<Record<string, any>>(), // Additional JSON options for the connections, api keys, etc.
    tokenCounter: text('token_counter').notNull().default("estimate")
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


