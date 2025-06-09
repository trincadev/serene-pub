import { FormatNames } from "$lib/shared/constants/FormatNames";
import _ from "lodash";

export class BlockGenerator {
    static chatmlOpen(role: string) { return `<|im_start|>${role}\n\n`; }
    static chatmlClose = "<|im_end|>\n";
    static basicOpen(role: string) { return `*** ${role}\n\n`; }
    static basicClose = "\n\n";
    static vicunaOpen(role: string) { return `### ${_.capitalize(role)}:\n\n`; }
    static vicunaClose = "\n";
    static openaiOpen(role: string) { return `<|${role}|>\n\n`; }
    static openaiClose = "\n";

    static makeBlock({ format, role, content, includeClose = true }: { format: typeof FormatNames.OPTION, role: string, content: string, includeClose?: boolean }) {
        switch (format) {
            case FormatNames.ChatML:
                return this.chatmlOpen(role) + content + (includeClose ? this.chatmlClose : "");
            case FormatNames.Basic:
                return this.basicOpen(role) + content + (includeClose ? this.basicClose : "");
            case FormatNames.Vicuna:
                return this.vicunaOpen(role) + content + (includeClose ? this.vicunaClose : "");
            case FormatNames.OpenAI:
                return this.openaiOpen(role) + content + (includeClose ? this.openaiClose : "");
            default:
                return this.chatmlOpen(role) + content + (includeClose ? this.chatmlClose : "");
        }
    }
}