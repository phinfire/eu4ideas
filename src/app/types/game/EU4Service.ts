import { Injectable } from "@angular/core";
import { Jomini } from "jomini";
import JSZip from "jszip";
import { Idea } from "./Idea";
import { FourteenFortyFourProvider } from "./FourteenFortyFourProvider";
import { Modifier } from "./Modifier";
import { IIconProvider } from "../keyedIcons/IIconProvider";
import { KeyedIcon } from "../keyedIcons/KeyedIcon";

export enum Mana {
    ADM = "ADM",
    DIP = "DIP",
    MIL = "MIL"
}

export enum NumberKind {
    CONSTANT,
    MULTIPLICATIVE,
    ADDITIVE
}

@Injectable({providedIn: 'root'})
export class EU4Service {

    private static DEFAULT_CUSTOM_IDEA_COSTS_PER_LEVEL = [0, 5, 15, 30]

    private rootRootUrl = "https://codingafterdark.de/";
    private readonly rootUrl = "https://codingafterdark.de/ide/";

    private ideas: Map<string,Map<string,Idea>> = new Map();
    private idea2ModifierIntepretation: Map<string,NumberKind> = new Map();
    private idea2Localisation: Map<string,string> = new Map();
    private category2IdeaKeys: Map<Mana,string[]> = new Map();
    private ftffp: FourteenFortyFourProvider;

    constructor() {
        this.ftffp = new FourteenFortyFourProvider();
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
                                        this.extractIdeas(parser.parseText(text));
                                    });
                                }
                            });
                        });
                    });
                });
    }

    public get1444Provider() {
        return this.ftffp;
    }

    public getTypeOfIdea(ideaKey: string) {
        return this.idea2ModifierIntepretation.get(ideaKey)!;
    }

    public localizeIdea(ideaKey: string) {
        return this.idea2Localisation.get(ideaKey) || ideaKey;
    }

    public extractIdeas(parsed: any) {
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
                const idea = new Idea(new Modifier(mana, modifierIdeaKey, parseFloat(ideaData[modifierIdeaKey])), costPerLevel);
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
            if (this.ideas.size > 0 && this.idea2ModifierIntepretation.size > 0 && this.idea2Localisation.size > 0) {
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

    public getManaSymbol(mana: Mana) {
        if (mana == Mana.ADM) {
            return this.rootRootUrl + "mk-ideas/icon_powers_administrative.webp";
        }
        if (mana == Mana.DIP) {
            return this.rootRootUrl + "mk-ideas/icon_powers_diplomatic.webp";
        }
        if (mana == Mana.MIL) {
            return this.rootRootUrl + "mk-ideas/icon_powers_military.webp";
        }
        throw new Error("Unknown mana type: " + mana);
    }

    public getIdeaIconProvider() {
        const outerThis = this;
        return new class implements IIconProvider {
            getIcons(): Promise<KeyedIcon[]> {
                const customIdeas = outerThis.getCustomIdeas();
                const icons: KeyedIcon[] = [];
                return outerThis.waitUntilReady().then(() => {
                    const adm = Array.from(customIdeas.get("ADM")!.values());
                    const dip = Array.from(customIdeas.get("DIP")!.values());
                    const mil = Array.from(customIdeas.get("MIL")!.values());
                    adm.concat(dip).concat(mil).forEach(idea => {
                    icons.push({ key: idea.getKey(), imageUrl: outerThis.getIdeaIconImageUrl(idea.getKey()), name: outerThis.localizeIdea(idea.getKey()) });
                    });
                    return icons;
                });
            }
        };
    }
}