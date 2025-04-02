import { Injectable } from "@angular/core";
import { Jomini } from "jomini";
import JSZip from "jszip";
import { Idea } from "./Idea";
import { Modifier } from "./Modifier";
import { IIconProvider } from "../keyedIcons/IIconProvider";
import { KeyedIcon } from "../keyedIcons/KeyedIcon";
import { Mana } from "./Mana";

export enum NumberKind {
    CONSTANT,
    MULTIPLICATIVE,
    ADDITIVE
}

@Injectable({providedIn: 'root'})
export class EU4Service {

    private static DEFAULT_CUSTOM_IDEA_COSTS_PER_LEVEL = [0, 5, 15, 30,
        45, 60, 75, 90,
        105, 120, 135, 150];

    private readonly rootUrl = "https://codingafterdark.de/ide/";

    private ideas = new Map<string,Idea>();
    private idea2ModifierIntepretation: Map<string,NumberKind> = new Map();
    private idea2Localisation: Map<string,string> = new Map();
    private category2IdeaKeys: Map<Mana,string[]> = new Map();

    constructor() {
        fetch("https://codingafterdark.de/ide/modifiers.json?" + new Date().getTime())
            .then(response => response.json())
            .then(data => {
                for (let categoryString of Object.keys(data)) {
                    const category = categoryString == "ADM" ? Mana.ADM : categoryString == "DIP" ? Mana.DIP : Mana.MIL;
                    const ideas = data[categoryString];
                    for (let ideaKey of Object.keys(ideas)) {
                        const kindString = ideas[ideaKey].kind;
                        const loc = ideas[ideaKey].loc;
                        this.idea2Localisation.set(ideaKey, loc);
                        if (kindString == "m") {
                            this.idea2ModifierIntepretation.set(ideaKey, NumberKind.MULTIPLICATIVE);
                        } else if (kindString == "a") {
                            this.idea2ModifierIntepretation.set(ideaKey, NumberKind.ADDITIVE);
                        } else if (kindString == "c") {
                            this.idea2ModifierIntepretation.set(ideaKey, NumberKind.CONSTANT);
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
                                        const ideas = EU4Service.extractIdeas(parser.parseText(text));
                                        for (let idea of ideas) {
                                            this.ideas.set(idea.getKey(), idea);
                                        }
                                    });
                                }
                            });
                        });
                    });
            });
    }

    public getTypeOfIdea(ideaKey: string) {
        return this.idea2ModifierIntepretation.get(ideaKey)!;
    }

    public localizeIdea(ideaKey: string) {
        return this.idea2Localisation.get(ideaKey) || ideaKey;
    }

    private static extractIdeas(parsed: any) {
        const ideas = [];
        for (let key of Object.keys(parsed)) {
            const category = parsed[key].category;
            for (let natIdeaName of Object.keys(parsed[key]).filter(k => k != "category")) {
                const ideaData = parsed[key][natIdeaName];
                const maxLevel = ideaData.max_level ? parseInt(ideaData.max_level) : 4;
                const costPerLevel: number[] = [];
                for (let i = 1; i <= maxLevel; i++) {
                    if (ideaData["level_cost_" + i]) {
                        costPerLevel.push(parseInt(ideaData["level_cost_" + i]));
                    } else {
                        costPerLevel.push(EU4Service.DEFAULT_CUSTOM_IDEA_COSTS_PER_LEVEL[i-1]);
                    }
                }
                const modifierIdeaKey = Object.keys(ideaData).find(k => !k.startsWith("level_cost") && k != "max_level")!;
                const mana = category == "ADM" ? Mana.ADM : category == "DIP" ? Mana.DIP : Mana.MIL;
                let modifierValue =  parseFloat(ideaData[modifierIdeaKey]);
                if (isNaN(modifierValue)) {
                    modifierValue = 1;
                }
                ideas.push(new Idea(new Modifier(mana, modifierIdeaKey, modifierValue), costPerLevel));
            }
        }
        return ideas;
    }

    public getIdeaIconImageUrl(ideaKey: string) {
        return this.rootUrl + "gfx/ideas/" + ideaKey + ".webp";
    }

    public getCustomIdeas() {
        return this.ideas;
    }

    public waitUntilReady() {
        return new Promise((resolve) => {
            if (this.ideas.size > 0 && this.idea2ModifierIntepretation.size > 0 && this.idea2Localisation.size > 0) {
                resolve(null);
            } else {
                setTimeout(() => {
                    this.waitUntilReady().then(() => resolve(null));
                }, 100);
            }
        });
    }

    public getIdea(key: string) {
        const idea = this.ideas.get(key);
        if (idea) {
            return idea;
        }
        throw new Error("Idea not found: \"" + key + "\" (" + this.ideas.size + " ideas available)");
    }
}