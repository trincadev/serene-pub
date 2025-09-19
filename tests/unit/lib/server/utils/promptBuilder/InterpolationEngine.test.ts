import { describe, it, expect } from "vitest"
import {
    InterpolationEngine,
    createInterpolationEngine,
    interpolateTemplate,
    createBasicContext,
    type InterpolationContext,
    type CharacterData,
    type PersonaData
} from "$lib/server/utils/promptBuilder/InterpolationEngine"

describe("InterpolationEngine", () => {
    const engine = new InterpolationEngine()

    describe("createInterpolationContext", () => {
        it("creates context with character and persona names", () => {
            const ctx = engine.createInterpolationContext({
                currentCharacterName: "Alice",
                currentPersonaName: "Bob"
            })
            expect(ctx.char).toBe("Alice")
            expect(ctx.character).toBe("Alice")
            expect(ctx.user).toBe("Bob")
            expect(ctx.persona).toBe("Bob")
        })

        it("defaults persona name to 'user' if not provided", () => {
            const ctx = engine.createInterpolationContext({
                currentCharacterName: "Alice"
            })
            expect(ctx.user).toBe("user")
            expect(ctx.persona).toBe("user")
        })

        it("merges additional context", () => {
            const ctx = engine.createInterpolationContext({
                currentCharacterName: "Alice",
                currentPersonaName: "Bob",
                additionalContext: { foo: "bar" }
            })
            expect(ctx.foo).toBe("bar")
        })
    })

    describe("interpolateString", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }

        it("interpolates variables in string", () => {
            const result = engine.interpolateString("Hello, {{char}} and {{user}}!", context)
            expect(result).toBe("Hello, Alice and Bob!")
        })

        it("returns undefined if template is undefined", () => {
            expect(engine.interpolateString(undefined, context)).toBeUndefined()
        })

        it("returns original template if interpolation fails", () => {
            const result = engine.interpolateString("{{#if}", context)
            expect(result).toBe("{{#if}")
        })
    })

    describe("interpolateStrings", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }
        it("interpolates multiple strings", () => {
            const templates = {
                a: "Hi {{char}}",
                b: "Bye {{user}}",
                c: undefined
            }
            const result = engine.interpolateStrings(templates, context)
            expect(result).toEqual({
                a: "Hi Alice",
                b: "Bye Bob",
                c: undefined
            })
        })
    })

    describe("interpolateCharacterData", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }
        it("interpolates all fields in character data", () => {
            const character: CharacterData = {
                name: "{{char}}",
                nickname: "{{user}}",
                description: "Desc {{char}}",
                personality: "Kind {{user}}"
            }
            const result = engine.interpolateCharacterData(character, context)
            expect(result.name).toBe("Alice")
            expect(result.nickname).toBe("Bob")
            expect(result.description).toBe("Desc Alice")
            expect(result.personality).toBe("Kind Bob")
        })

        it("handles missing optional fields", () => {
            const character: CharacterData = {
                name: "{{char}}",
                description: "Desc {{char}}"
            }
            const result = engine.interpolateCharacterData(character, context)
            expect(result.nickname).toBeUndefined()
            expect(result.personality).toBeUndefined()
        })
    })

    describe("interpolateCharacters", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }
        it("interpolates array of characters", () => {
            const characters: CharacterData[] = [
                { name: "{{char}}", description: "Desc {{char}}" },
                { name: "Static", description: "Desc {{user}}" }
            ]
            const result = engine.interpolateCharacters(characters, context)
            expect(result[0].name).toBe("Alice")
            expect(result[1].description).toBe("Desc Bob")
        })
    })

    describe("interpolatePersonaData", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }
        it("interpolates persona fields", () => {
            const persona: PersonaData = {
                name: "{{user}}",
                description: "Desc {{persona}}"
            }
            const result = engine.interpolatePersonaData(persona, context)
            expect(result.name).toBe("Bob")
            expect(result.description).toBe("Desc Bob")
        })
    })

    describe("interpolatePersonas", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }
        it("interpolates array of personas", () => {
            const personas: PersonaData[] = [
                { name: "{{user}}", description: "Desc {{persona}}" },
                { name: "Static", description: "Desc {{char}}" }
            ]
            const result = engine.interpolatePersonas(personas, context)
            expect(result[0].name).toBe("Bob")
            expect(result[1].description).toBe("Desc Alice")
        })
    })

    describe("interpolateObject", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }
        it("interpolates all string fields by default", () => {
            const obj = {
                a: "Hi {{char}}",
                b: "Bye {{user}}",
                c: 42
            }
            const result = engine.interpolateObject(obj, context)
            expect(result.a).toBe("Hi Alice")
            expect(result.b).toBe("Bye Bob")
            expect(result.c).toBe(42)
        })

        it("interpolates only specified string fields", () => {
            const obj = {
                a: "Hi {{char}}",
                b: "Bye {{user}}",
                c: "No change"
            }
            const result = engine.interpolateObject(obj, context, ["a"])
            expect(result.a).toBe("Hi Alice")
            expect(result.b).toBe("Bye {{user}}")
            expect(result.c).toBe("No change")
        })
    })

    describe("createMessageContext", () => {
        it("overrides base context with provided values", () => {
            const base: InterpolationContext = {
                char: "Alice",
                character: "Alice",
                user: "Bob",
                persona: "Bob"
            }
            const overrides = { char: "Eve", user: "Mallory" }
            const ctx = engine.createMessageContext(base, overrides)
            expect(ctx.char).toBe("Eve")
            expect(ctx.user).toBe("Mallory")
            expect(ctx.character).toBe("Alice")
        })
    })
})

describe("createInterpolationEngine", () => {
    it("creates an InterpolationEngine instance", () => {
        const engine = createInterpolationEngine()
        expect(engine).toBeInstanceOf(InterpolationEngine)
    })
})

describe("interpolateTemplate", () => {
    it("interpolates a template string", () => {
        const context: InterpolationContext = {
            char: "Alice",
            character: "Alice",
            user: "Bob",
            persona: "Bob"
        }
        const result = interpolateTemplate("Hello {{char}}", context)
        expect(result).toBe("Hello Alice")
    })
})

describe("createBasicContext", () => {
    it("creates a basic context with character and persona", () => {
        const ctx = createBasicContext("Alice", "Bob")
        expect(ctx.char).toBe("Alice")
        expect(ctx.user).toBe("Bob")
    })

    it("defaults persona to 'user'", () => {
        const ctx = createBasicContext("Alice")
        expect(ctx.user).toBe("user")
    })
})