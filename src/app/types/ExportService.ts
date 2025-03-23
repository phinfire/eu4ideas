import { Injectable } from "@angular/core";
import { IIdea } from "./game/IIdea";

@Injectable({providedIn: 'root'})
export class ExportService {

    constructor() {
        
    }

    public getIdeaString(tag: string, ideas: IIdea[], levels: number[]) {
        if (ideas.length !== levels.length) {
            throw new Error("Ideas and levels must have the same length");
        }
        const traditions = ideas.slice(0, 2);
        const mainIdeas = ideas.slice(2, 9);
        const ambition = ideas.slice(9, 10);

        let resultLines = [tag + "_nat_ideas = {\n"];
        resultLines.push(this.ideasToBlockLines("start", traditions, levels.slice(0, 2)).map(line => "\t" + line).join("\n"));
        resultLines.push(this.getWrappedInCurlyConstruct("trigger", ["tag = " + tag]).map(line => "\t" + line).join("\n"));
        resultLines.push("\tfree = yes");
        for (let i = 0; i < mainIdeas.length; i++) {
            resultLines.push(this.ideasToBlockLines(tag + "_idea_" + i, [mainIdeas[i]], [levels[i + 2]]).map(line => "\t" + line).join("\n"));
        }
        resultLines.push(this.ideasToBlockLines("bonus", ambition, levels.slice(8, 10)).map(line => "\t" + line).join("\n"));
        resultLines.push("}");
        return resultLines.join("\n");
    }

    private ideasToBlockLines = (key: string, ideas: IIdea[], levels: number[]) => {
        const bodyLines = [];
        for (let i = 0; i < ideas.length; i++) {
            bodyLines.push(ideas[i].getKey() + " = " + ideas[i].getModifierAtLevel(levels[i]));
        }
        return this.getWrappedInCurlyConstruct(key, bodyLines);
    }

    private getWrappedInCurlyConstruct(key: string, lines: string[]) {
        return [
            key + " = {",
            ...lines.map(line => "\t" + line),
            "}"
        ];
    }
}