import { Injectable } from "@angular/core";
import { IIdea } from "./game/IIdea";
import JSZip from "jszip";

@Injectable({providedIn: 'root'})
export class ExportService {

    private static LOC_SEPARATOR = ":0";

    constructor() {
        
    }

    public downloadAsZip( tag: string, ideaString: string, locSnippet: string, ) {
        const zip = new JSZip();
        zip.file(`${tag}.yml`, locSnippet);
        zip.file(`${tag}.txt`, ideaString);

        zip.generateAsync({ type: "blob" }).then((content) => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = `${tag}.zip`;
            a.click();
        });
    }

    public getLocSnippet(tag: string, locTitles: string[], locDescriptions: string[]) {
        const lines = [];
        for (let i = 0; i < locTitles.length; i++) {
            const titleLine = this.getNThIdeaKey(tag, i) + ExportService.LOC_SEPARATOR + " \""  + locTitles[i].replace("\n", " ") + "\"";
            const descriptionLine = this.getNThIdeaKey(tag, i) + "_desc" + ExportService.LOC_SEPARATOR + " \""  + locDescriptions[i].replace("\n", " ") + "\"";
            lines.push(titleLine);
            lines.push(descriptionLine);
        }

        return lines.join("\n");
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
            resultLines.push(this.ideasToBlockLines(this.getNThIdeaKey(tag,i), [mainIdeas[i]], [levels[i + 2]]).map(line => "\t" + line).join("\n"));
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

    private getNThIdeaKey(tag: string, n: number) {
        return tag + "_idea_" + n;
    }
}