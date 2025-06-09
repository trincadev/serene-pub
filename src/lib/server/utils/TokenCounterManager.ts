import { countTokens as countGpt2Tokens } from 'gpt-tokenizer/encoding/r50k_base';
import { countTokens as countGpt35Tokens } from 'gpt-tokenizer/encoding/cl100k_base';
import { countTokens as countGpt4Tokens } from 'gpt-tokenizer/encoding/cl100k_base';
import { countTokens as countGpt4oTokens } from 'gpt-tokenizer/encoding/o200k_base';
import llamaTokenizer from 'llama-tokenizer-js'
import llama3Tokenizer from 'llama3-tokenizer-js'
import mistralTokenizer from 'mistral-tokenizer-js'

export interface TokenCounter {
    countTokens(text: string): Promise<number> | number
}

export class EstimateTokenCounter implements TokenCounter {
    countTokens(text: string): number {
        return Math.ceil(text.length / 4)
    }
}

export class OpenAIGPT2TokenCounter implements TokenCounter {
  countTokens(text: string): number {
    return countGpt2Tokens(text);
  }
}

export class OpenAIGPT35TokenCounter implements TokenCounter {
  countTokens(text: string): number {
    return countGpt35Tokens(text);
  }
}

export class OpenAIGPT4TokenCounter implements TokenCounter {
  countTokens(text: string): number {
    return countGpt4Tokens(text);
  }
}

export class OpenAIGPT4oTokenCounter implements TokenCounter {
  countTokens(text: string): number {
    return countGpt4oTokens(text);
  }
}

export class LlamaTokenCounter implements TokenCounter {
    countTokens(text: string): number {
        return llamaTokenizer.encode(text).length
    }
}

export class Llama3TokenCounter implements TokenCounter {
    countTokens(text: string): number {
        return llama3Tokenizer.encode(text).length
    }
}

export class MistralTokenCounter implements TokenCounter {
    countTokens(text: string): number {
        return mistralTokenizer.encode(text).length
    }
}

export class AnthropicClaudeTokenCounter implements TokenCounter {
    countTokens(text: string): number {
        return Math.ceil(text.length / 3.6)
    }
}

export class CohereTokenCounter implements TokenCounter {
    countTokens(text: string): number {
        return Math.ceil(text.length / 5)
    }
}

export class GeminiTokenCounter implements TokenCounter {
    countTokens(text: string): number {
        return Math.ceil(text.length / 4)
    }
}

export type TokenCounterDescriptor = {
    label: string
    counter: TokenCounter
}

export class TokenCounterManager {
    static counters: Record<string, TokenCounterDescriptor> = {
        estimate: {
            label: "Estimate",
            counter: new EstimateTokenCounter()
        },
        "openai-gpt2": {
            label: "OpenAI GPT-2/3",
            counter: new OpenAIGPT2TokenCounter()
        },
        "openai-gpt3.5": {
            label: "OpenAI GPT-3.5 Turbo",
            counter: new OpenAIGPT35TokenCounter()
        },
        "openai-gpt4": {
            label: "OpenAI GPT-4",
            counter: new OpenAIGPT4TokenCounter()
        },
        "openai-gpt4o": {
            label: "OpenAI GPT-4o",
            counter: new OpenAIGPT4oTokenCounter()
        },
        llama: {
            label: "Llama",
            counter: new LlamaTokenCounter()
        },
        llama3: {
            label: "Llama 3",
            counter: new LlamaTokenCounter()
        },
        mistral: {
            label: "Mistral/Mixtral",
            counter: new MistralTokenCounter()
        },
        "anthropic-claude": {
            label: "Anthropic Claude",
            counter: new AnthropicClaudeTokenCounter()
        },
        cohere: {
            label: "Cohere",
            counter: new CohereTokenCounter()
        },
        gemini: {
            label: "Google Gemini/PaLM",
            counter: new GeminiTokenCounter()
        }
    }

    private active: string

    constructor(strategy: string = "estimate") {
        if (!(strategy in TokenCounterManager.counters)) {
            throw new Error(`Unknown strategy: ${strategy}`)
        }
        this.active = strategy
    }

    countTokens(text: string): number | Promise<number> {
        return TokenCounterManager.counters[this.active].counter.countTokens(text)
    }

    static availableStrategies(): Record<string, string> {
        const map: Record<string, string> = {}
        for (const key in TokenCounterManager.counters) {
            map[key] = TokenCounterManager.counters[key].label
        }
        return map
    }
}

// Example Usage:
// const manager = new TokenCounterManager("mistral");
// const tokens = manager.countTokens("Some text here");
