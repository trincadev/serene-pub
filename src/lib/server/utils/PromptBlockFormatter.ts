import { PromptFormats } from "$lib/shared/constants/PromptFormats";
import _ from "lodash";

export class PromptBlockFormatter {
    static readonly CHATML_OPEN = "<|im_start|>";
    static readonly CHATML_CLOSE = "<|im_end|>\n";
    static readonly BASIC_OPEN = "*** ";
    static readonly BASIC_CLOSE = "\n\n";
    static readonly VICUNA_OPEN = "### ";
    static readonly VICUNA_CLOSE = "\n";
    static readonly OPENAI_OPEN = "<|";
    static readonly OPENAI_CLOSE = "\n";

    static chatmlOpen(role: string) { return `${PromptBlockFormatter.CHATML_OPEN}${role}\n`; }
    static chatmlClose = PromptBlockFormatter.CHATML_CLOSE;
    static basicOpen(role: string) { return `${PromptBlockFormatter.BASIC_OPEN}${role}\n`; }
    static basicClose = PromptBlockFormatter.BASIC_CLOSE;
    static vicunaOpen(role: string) { return `${PromptBlockFormatter.VICUNA_OPEN}${_.capitalize(role)}:\n`; }
    static vicunaClose = PromptBlockFormatter.VICUNA_CLOSE;
    static openaiOpen(role: string) { return `${PromptBlockFormatter.OPENAI_OPEN}${role}|>\n`; }
    static openaiClose = PromptBlockFormatter.OPENAI_CLOSE;

    static makeBlock({ format, role, content, includeClose = true }: { format: string, role: string, content: string, includeClose?: boolean }) {
        switch (format) {
            case PromptFormats.CHATML:
                return this.chatmlOpen(role) + content + (includeClose ? this.chatmlClose : "");
            case PromptFormats.BASIC:
                return this.basicOpen(role) + content + (includeClose ? this.basicClose : "");
            case PromptFormats.VICUNA:
                return this.vicunaOpen(role) + content + (includeClose ? this.vicunaClose : "");
            case PromptFormats.OPENAI:
                return this.openaiOpen(role) + content + (includeClose ? this.openaiClose : "");
            default:
                return this.chatmlOpen(role) + content + (includeClose ? this.chatmlClose : "");
        }
    }
}