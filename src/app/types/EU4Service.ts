import { Injectable } from "@angular/core";
import { Jomini } from "jomini";
import JSZip from "jszip";
import { Idea } from "./Idea";

export enum NumberKind {
    CONSTANT,
    MULTIPLICATIVE,
    ADDITIVE
}

@Injectable({providedIn: 'root'})
export class EU4Service {

    private readonly rootUrl = "https://codingafterdark.de/ide/";

    private ideas: Map<string,Map<string,Idea>> = new Map();
    private idea2Category: Map<string,string> = new Map();
    private idea2NumberKind: Map<string,NumberKind> = new Map();
    private idea2Localisation: Map<string,string> = new Map();
    private category2IdeaKeys: Map<string,string[]> = new Map();

    constructor() {
        fetch("https://codingafterdark.de/ide/modifiers.json?" + new Date().getTime())
            .then(response => response.json())
            .then(data => {
                for (let category of Object.keys(data)) {
                    for (let ideaKey of Object.keys(data[category])) {
                        const kindString = data[category][ideaKey].kind;
                        const loc = data[category][ideaKey].loc;
                        this.idea2Category.set(ideaKey, category);
                        this.idea2Localisation.set(ideaKey, loc);
                        if (kindString == "m") {
                            this.idea2NumberKind.set(ideaKey, NumberKind.MULTIPLICATIVE);
                        } else if (kindString == "a") {
                            this.idea2NumberKind.set(ideaKey, NumberKind.ADDITIVE);
                        } else if (kindString == "c") {
                            this.idea2NumberKind.set(ideaKey, NumberKind.CONSTANT);
                        } else {
                            throw new Error("Unknown number kind: " + kindString);
                        }
                        if (!this.category2IdeaKeys.has(category)) {
                            this.category2IdeaKeys.set(category, []);
                        }
                        this.category2IdeaKeys.get(category)!.push(ideaKey);
                    }
                }

            }).then(() => {
                fetch("https://codingafterdark.de/ide/custom_ideas.zip")
                    .then(response => response.blob())
                    .then(data => {
                        const zip = new JSZip();
                        Jomini.initialize().then((parser) => {
                            zip.loadAsync(data).then((contents) => {
                                for (const key in contents.files) {
                                    contents.files[key].async("text").then((text) => {
                                        this.extractIdeas(parser.parseText(text));
                                    });
                                }
                            });
                        });
                    });
                });
    }

    public getTypeOfIdea(ideaKey: string) {
        return this.idea2NumberKind.get(ideaKey)!;
    }

    public localizeIdea(ideaKey: string) {
        if (this.idea2Localisation.has(ideaKey)) {
            return this.idea2Localisation.get(ideaKey)!;
        }
        return ideaKey;
    }

    public extractIdeas(parsed: any) {
        for (let key of Object.keys(parsed)) {
            const category = parsed[key].category;
            for (let natIdeaName of Object.keys(parsed[key]).filter(k => k != "category")) {
                const ideaData = parsed[key][natIdeaName];
                const maxLevel = ideaData.max_level ? parseInt(ideaData.max_level) : 4;
                const costPerLevel = [];
                for (let i = 1; i <= maxLevel; i++) {
                    if (ideaData["level_cost_" + i]) {
                        costPerLevel.push(parseInt(ideaData["level_cost_" + i]));
                    } else if (i == 1) {
                        costPerLevel.push(0);
                    }
                }
                const modifierIdeaKey = Object.keys(ideaData).find(k => !k.startsWith("level_cost") && k != "max_level")!;
                const idea = new Idea(modifierIdeaKey, parseFloat(ideaData[modifierIdeaKey]), costPerLevel);
                this.addIdea(category, modifierIdeaKey, idea);
            }
        }
    }

    private addIdea(category: string, key: string, idea: Idea) {
        if (!this.ideas.has(category)) {
            this.ideas.set(category, new Map());
        }
        this.ideas.get(category)!.set(key, idea);
    }

    public getIdeaIconImageUrl(ideaKey: string) {
        return this.rootUrl + "gfx/ideas/" + ideaKey + ".webp";
    }

    public getCustomIdeas() {
        return this.ideas;
    }

    public getCustomIdeaWeights() {
        return [2, 2, 1.8, 1.6, 1.4, 1,2, 1, 1, 1]
    }

    public getCategory2IdeaKeys() {
        return this.category2IdeaKeys;
    }

    public waitUntilReady() {
        return new Promise((resolve, reject) => {
            if (this.ideas.size > 0 && this.idea2Category.size > 0 && this.idea2NumberKind.size > 0 && this.idea2Localisation.size > 0) {
                resolve(null);
            } else {
                setTimeout(() => {
                    this.waitUntilReady().then(() => resolve(null));
                }, 100);
            }
        });
    }

    public getIdeaKind(key: string) {
        for (let [category, idea] of this.ideas.entries()) {
            if (idea.has(key)) {
                return category;
            }
        }
        return null;
    }

    public getIdea(key: string) {
        for (let [category, idea] of this.ideas.entries()) {
            if (idea.has(key)) {
                return idea.get(key)!;
            }
        }
        throw new Error("Idea not found: " + key);
    }
}