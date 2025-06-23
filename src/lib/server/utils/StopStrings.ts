import { PromptFormats } from "$lib/shared/constants/PromptFormats";

export class StopStrings {
    static get({format, characters, personas}:{format: typeof PromptFormats.keys[0], characters: SelectCharacter[], personas: SelectPersona[]}): string[] {
        let stopStrings: string[] = []
        
        switch (format) {
            case PromptFormats.CHATML:
                // <|im_end|> is the explicit stop string for ChatML, plus block starters and template markers
                stopStrings = [
                    "<|im_end|>",
                    // "<|im_start|>",
                    // "system:",
                    // "System:",
                    // "user:",
                    // "User:",
                    // "assistant:",
                    // "Assistant:"
                ];
                break
            case PromptFormats.BASIC:
                // Block starters for Basic, plus template markers
                stopStrings = [
                    // "*** user",
                    // "*** char",
                    // "*** assistant",
                    // "*** system",
                    // "system:",
                    // "System:",
                    // "user:",
                    // "User:",
                    // "assistant:",
                    // "Assistant:"
                ];
                break
            case PromptFormats.VICUNA:
                // Block starters for Vicuna, plus </s> and template markers
                stopStrings = [
                    "</s>",
                    // "### User:",
                    // "### Char:",
                    // "### Assistant:",
                    // "### System:",
                    // "system:",
                    // "System:",
                    // "user:",
                    // "User:",
                    // "assistant:",
                    // "Assistant:"
                ];
                break
            case PromptFormats.OPENAI:
                // Block starters for OpenAI, plus template markers
                stopStrings = [
                    // "<|user|>",
                    // "<|char|>",
                    // "<|assistant|>",
                    // "<|system|>",
                    // "system:",
                    // "System:",
                    // "user:",
                    // "User:",
                    // "assistant:",
                    // "Assistant:"
                ];
                break
            default:
                stopStrings = [];
        }


        // Iterate through characters and personas to add their names
        characters.forEach(character => {
            if (character.name) {
                const charStop = `${character.name}:`
                stopStrings.push(charStop)
            }
            if (character.nickname) {
                const charStop = `${character.nickname}:`
                stopStrings.push(charStop)
            }
        });
        personas.forEach(persona => {
            if (persona.name) {
                const userStop = `${persona.name}:`
                stopStrings.push(userStop)
            }
        })

        return stopStrings
    }
}