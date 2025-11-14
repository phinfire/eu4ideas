import { Injectable } from "@angular/core";
import { IIdea } from "./game/IIdea";
import JSZip from "jszip";
import { IdeaAtLevel } from "./IdeaAtLevel";
import { Jomini } from "jomini";
import { EU4Service } from "./game/EU4Service";
import { UserConfigurationProvider } from "./UserConfigurationProvider";

@Injectable({providedIn: 'root'})
export class ImportExportService {

    private static LOC_SEPARATOR = ":0";
    private static HIGH_PRIORITY_LOC_SEPARATOR = ":3";

    constructor(private ideaProvider: UserConfigurationProvider) {

    }

    parseIdeas(parser: Jomini, ideaFileContent: string) {
        const parsed = parser.parseText(ideaFileContent);
        let tag = "";
        const ideasAndLevels = [];
        for (const ideaSetKey in parsed) {
            for (const ideaEntryKey in parsed[ideaSetKey]) {
                if (ideaEntryKey == "trigger") {
                    tag = parsed[ideaSetKey][ideaEntryKey]["tag"];
                    continue;
                }
                if (ideaEntryKey != "start" && ideaEntryKey != "bonus" && Object.keys(parsed[ideaSetKey][ideaEntryKey]).length > 1) {
                    throw new Error("Too many modifiers for idea " + ideaEntryKey + " in set " + ideaSetKey);
                }
                for (const modifierKey in parsed[ideaSetKey][ideaEntryKey]) {
                    const value = parsed[ideaSetKey][ideaEntryKey][modifierKey];
                    const idea = this.ideaProvider.getIdea(modifierKey);
                    const level = this.ideaProvider.calculateLevelFromModifiers(idea.getModifierAtLevel(1), value);
                    ideasAndLevels.push(new IdeaAtLevel(idea, level));
                }
            }
        }
        return {tag: tag, ideas: ideasAndLevels};
    }
    
    parseLocSnippet(locSnippet: string) {
        const key2value = new Map<string, string>();
        let pos = 0;
        while(true) {
            const indexOfSeparator = locSnippet.indexOf(ImportExportService.LOC_SEPARATOR, pos);
            if (indexOfSeparator == -1) {
                break;
            }
            const indexOfStringStart = locSnippet.indexOf("\"", indexOfSeparator);
            if (indexOfStringStart == -1) {
                throw new Error("Invalid loc snippet (missing string):\n" + locSnippet);
            }
            const indexOfStringEnd = locSnippet.indexOf("\"", indexOfStringStart + 1);
            if (indexOfStringEnd == -1) {
                throw new Error("Invalid loc snippet (unterminated string):\n" + locSnippet);
            }
            const key = locSnippet.substring(pos, indexOfSeparator).trim();
            const value = locSnippet.substring(indexOfStringStart + 1, indexOfStringEnd).trim();
            key2value.set(key, value); 
            pos = indexOfStringEnd + 1;
        }
        return key2value;
    }

    public downloadAsZip(tag: string, ideaString: string, locSnippet: string, ) {
        const zip = new JSZip();
        zip.file(`${tag}.yml`, locSnippet);
        zip.file(`${tag}.txt`, ideaString);

        zip.generateAsync({ type: "blob" }).then((content) => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = `${tag}.zip`;
            a.click();
        });
        console.log(ideaString);
    }

    public getLocSnippet(tag: string, locTitles: string[], locDescriptions: string[]) {
        const lines = [];
        for (let i = 0; i < locTitles.length; i++) {
            const titleLine = this.getNThIdeaKey(tag, i) + ImportExportService.LOC_SEPARATOR + " \""  + locTitles[i].replace("\n", " ") + "\"";
            const desc = locDescriptions[i].replaceAll("\n", " ").replace(/['"`]/g, '');
            if (desc.indexOf("\"") != -1) {
                throw new Error("Invalid description: " + desc);
            }
            const descriptionLine = this.getNThIdeaKey(tag, i) + "_desc" + ImportExportService.LOC_SEPARATOR + " \""  + desc + "\"";
            lines.push(titleLine);
            lines.push(descriptionLine);
        }
        return lines.join("\n");
    }

    public getNonStandardIdeaLocalisations(tag: string, tag2CountryName: Map<string, string>, inGerman: boolean) {
        if (inGerman) {
            return [
                this.getIdeaSetName(tag) + "_start" + ImportExportService.LOC_SEPARATOR + " \"" + tag2CountryName.get(tag) + " Ideen\"",
                this.getIdeaSetName(tag) + "_start" + ImportExportService.LOC_SEPARATOR + " \"" + tag2CountryName.get(tag) + " Traditionen\"",
                this.getIdeaSetName(tag) + "_bonus" + ImportExportService.LOC_SEPARATOR + " \"" + tag2CountryName.get(tag) + " Ambitionen\"",
            ].map(line => " " + line).join("\n");
        } else {
            return [
                this.getIdeaSetName(tag) + "_start" + ImportExportService.LOC_SEPARATOR + " \"" + tag2CountryName.get(tag) + " Ideas\"",
                this.getIdeaSetName(tag) + "_start" + ImportExportService.LOC_SEPARATOR + " \"" + tag2CountryName.get(tag) + " Traditions\"",
                this.getIdeaSetName(tag) + "_bonus" + ImportExportService.LOC_SEPARATOR + " \"" + tag2CountryName.get(tag) + " Ambitions\"",
            ].map(line => " " + line).join("\n");
        } 
    }

    public toLoc(locMap: Map<string,string>) {
        let output = "";
        for (const [key, value] of locMap.entries()) {
            output += " " + key + ":3 \"" + value.replace(/\n/g, " ") + "\"\n";
        }
        return output;
    }

    public getIdeaString(tag: string, ideaAtLevels: IdeaAtLevel[][]) {
        if (ideaAtLevels.length != 10) {
            throw new Error("Invalid number of ideas: " + ideaAtLevels.length);
        }

        let resultLines = [this.getIdeaSetName(tag) + " = {\n"];
        resultLines.push(this.ideasToBlockLines("start", ideaAtLevels[0].concat(ideaAtLevels[1])).map(line => "\t" + line).join("\n"));
        resultLines.push(this.getWrappedInCurlyConstruct("trigger", ["tag = " + tag]).map(line => "\t" + line).join("\n"));
        resultLines.push("\tfree = yes");
        for (let i = 2; i < 9; i++) {
            const indexInIdeas = i - 2;
            resultLines.push(this.ideasToBlockLines(this.getNThIdeaKey(tag,indexInIdeas), ideaAtLevels[i]).map(line => "\t" + line).join("\n"));
        }
        resultLines.push(this.ideasToBlockLines("bonus", ideaAtLevels[9]).map(line => "\t" + line).join("\n"));
        resultLines.push("}");
        return resultLines.join("\n");
    }

    private ideasToBlockLines = (key: string, ideasAndLevels: IdeaAtLevel[]) => {
        const bodyLines = [];
        for (let i = 0; i < ideasAndLevels.length; i++) {
            const decimalsOfbaseValue = ideasAndLevels[i].getIdea().getModifierAtLevel(1).toString().split(".")[1]?.length || 0;
            const value = ideasAndLevels[i].getIdea().getModifierAtLevel(ideasAndLevels[i].getLevel());
            const valuetruncatedToDecimals = value.toFixed(decimalsOfbaseValue);
            // This is a hack to avoid floating point precision fucking with the output
            bodyLines.push(ideasAndLevels[i].getIdea().getKey() + " = "+ valuetruncatedToDecimals);
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

    private getIdeaSetName(tag: string) {
        return tag + "_nat_ideas";
    }

    public initFileDragAndDropImport(dropArea: HTMLElement, callback: (result: Map<string,{ideas: IdeaAtLevel[], loc: Map<string,string>}>) => void) {
        dropArea.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    
        dropArea.addEventListener('drop', (event) => {
            console.log("Dropped files: ", event.dataTransfer?.files);
            event.preventDefault();
            event.stopPropagation();
            const droppedFiles = (event as DragEvent).dataTransfer!.files;
    
            if (droppedFiles && droppedFiles.length > 0) {
                Jomini.initialize().then((parser) => {
                    const fileReadPromises: Promise<void>[] = [];
                    const result = new Map<string,{ideas: IdeaAtLevel[], loc: Map<string,string>}>();
                    for (let file of droppedFiles) {
                        if (file.name.endsWith('.zip')) {
                            const reader = new FileReader();
                            const fileReadPromise = new Promise<void>((resolve) => {
                                reader.onload = async (e) => {
                                    if (e.target?.result instanceof ArrayBuffer) {
                                        const JSZip = (await import('jszip')).default;
                                        const zip = await JSZip.loadAsync(e.target.result);
                                        const fileNames = Object.keys(zip.files);
                                        for (const fileName of fileNames) {
                                            const fileContent = await zip.files[fileName].async("string");
                                            if (fileName.endsWith(".txt")) {
                                                const parsed = this.parseIdeas(parser, fileContent);
                                                if (!result.has(parsed.tag)) {
                                                    result.set(parsed.tag, {ideas: parsed.ideas, loc: new Map<string, string>() });
                                                } else {
                                                    result.set(parsed.tag, {ideas: parsed.ideas, loc: result.get(parsed.tag)!.loc });
                                                }
                                            }
                                            if (fileName.endsWith("yml")) {
                                                const parsedLoc = this.parseLocSnippet(fileContent);
                                                if (parsedLoc.size > 0) {
                                                    const firstKey = Array.from(parsedLoc.keys())[0];
                                                    const tag = firstKey.split("_")[0];
                                                    if (!result.has(tag)) {
                                                        result.set(tag, {ideas: [], loc: new Map<string, string>() });
                                                    }
                                                    const loc = result.get(tag)!.loc;
                                                    for (const [key, value] of parsedLoc.entries()) {
                                                        loc.set(key, value);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    resolve();
                                };
                            });
                            fileReadPromises.push(fileReadPromise);
                            reader.readAsArrayBuffer(file);
                        } else {
                            console.log("The dropped file is not a zip file.");
                        }
                    }
                    Promise.all(fileReadPromises).then(() => {
                        callback(result);
                    });
                });
            }
        });
    }
}