import { Injectable } from "@angular/core";
import { Jomini } from "jomini";
import JSZip from "jszip";
import { Idea } from "./Idea";
import { Modifier } from "./Modifier";
import { Mana } from "./Mana";

export enum NumberKind {
    CONSTANT,
    MULTIPLICATIVE,
    ADDITIVE
}

@Injectable({ providedIn: 'root' })
export class EU4Service {

    private static DEFAULT_CUSTOM_IDEA_COSTS_PER_LEVEL = [0, 5, 15, 30,
        45, 60, 75, 90,
        105, 120, 135, 150];

    private readonly rootUrl = "https://codingafterdark.de/ide/";

    private ideas = new Map<string, Idea>();
    private idea2ModifierIntepretation: Map<string, NumberKind> = new Map();
    private idea2Localisation: Map<string, string> = new Map();
    private category2IdeaKeys: Map<Mana, string[]> = new Map();
    private whitelistedModifiers: Set<string> = new Set();
    private balancedIdeas: Map<string, {costs: number[], value: number, localization: string}> = new Map();

    constructor() {
        // Fetch whitelist, balanced ideas, and custom ideas in parallel, wait for all to complete
        Promise.all([
            fetch("https://codingafterdark.de/mc/ideas/data/whitelist_table.txt?" + new Date().getTime())
                .then(response => response.text())
                .catch(err => {
                    console.warn("Failed to load whitelist, proceeding without filtering", err);
                    return "";
                }),
            fetch("https://codingafterdark.de/mc/ideas/data/balancedIdeas.txt?" + new Date().getTime())
                .then(response => response.text())
                .catch(err => {
                    console.warn("Failed to load balanced ideas, proceeding without", err);
                    return "";
                }),
            fetch("https://codingafterdark.de/mc/ideas/data/custom_idea_folder.json?" + new Date().getTime())
                .then(response => response.json())
        ]).then(([whitelist, balancedIdeasText, customIdeas]) => {
            // Parse whitelist first
            if (whitelist) {
                this.parseWhitelist(whitelist);
            }
            // Parse balanced ideas
            if (balancedIdeasText) {
                this.parseBalancedIdeas(balancedIdeasText);
            }
            // Then process ideas with both whitelists available
            const ideas = this.extractIdeasFromFolderJson(customIdeas);
            for (let idea of ideas) {
                console.log("Adding idea: ", idea.getKey());
                this.ideas.set(idea.getKey(), idea);
            }
            console.log("IDEAS: ", this.ideas);
        }).catch(err => {
            console.error("Error loading ideas, whitelist, or balanced ideas", err);
        });
            
        /*
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
            */
    }

    private extractIdeasFromFolderJson(json: any) {
        const allIdeas: Idea[] = [];
        for (const folderKey of Object.keys(json)) {
            const folder = json[folderKey];

            for (const categoryKey of Object.keys(folder)) {
                const categoryData = folder[categoryKey];
                const result = this.extractIdeaFromIdeaJson(categoryData);
                allIdeas.push(...result.ideas);
                
                // Apply side effects from metadata
                result.metadata.localisations.forEach((value, key) => {
                    this.idea2Localisation.set(key, value);
                });
                result.metadata.interpretations.forEach((value, key) => {
                    this.idea2ModifierIntepretation.set(key, value);
                });
                result.metadata.categoryKeys.forEach((value, key) => {
                    if (!this.category2IdeaKeys.has(key)) {
                        this.category2IdeaKeys.set(key, []);
                    }
                    this.category2IdeaKeys.get(key)!.push(...value);
                });
            }
        }

        return allIdeas;
    }

    private parseWhitelist(text: string): void {
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(';');
            if (parts.length > 0) {
                const modifier = parts[0].trim();
                if (modifier) {
                    this.whitelistedModifiers.add(modifier);
                }
            }
            console.log("Whitelist line parsed:", line);
        }
        console.log("Whitelist loaded with", this.whitelistedModifiers.size, "modifiers");
    }

    private parseBalancedIdeas(text: string): void {
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(';').map(p => p.trim()).filter(p => p !== '');
            if (parts.length < 3) continue;

            const modifierKey = parts[0];
            const localization = parts[1];
            const modifierValue = parseFloat(parts[parts.length - 1]);
            const costsRaw = parts.slice(2, -1);
            const costs = costsRaw.map(p => {
                const val = parseFloat(p);
                return isNaN(val) ? 0 : val;
            });

            this.balancedIdeas.set(modifierKey, {
                costs: costs,
                value: isNaN(modifierValue) ? 1 : modifierValue,
                localization: localization
            });
        }
        console.log("Balanced ideas loaded with", this.balancedIdeas.size, "modifiers");
    }

    private isWhitelisted(modifierKey: string): boolean {
        // If whitelist has been loaded, only allow whitelisted modifiers
        if (this.whitelistedModifiers.size > 0) {
            return this.whitelistedModifiers.has(modifierKey);
        }
        // Should not reach here if constructor properly waits for whitelist
        // But as fallback, allow if whitelist couldn't load
        return true;
    }

    private extractIdeaFromIdeaJson(json: any) {
        const ideas: Idea[] = [];
        const localisations = new Map<string, string>();
        const interpretations = new Map<string, NumberKind>();
        const categoryKeys = new Map<Mana, string[]>();
        
        const category = json.category;
        const mana = category == "ADM" ? Mana.ADM : category == "DIP" ? Mana.DIP : Mana.MIL;
        
        for (const ideaKey of Object.keys(json).filter(k => k !== "category")) {
            const ideaData = json[ideaKey];
            
            // Find the modifier key (the actual EU4 modifier name)
            const modifierIdeaKey = Object.keys(ideaData).find(k =>
                !k.startsWith("level_cost") &&
                k !== "max_level" &&
                k !== "chance" &&
                k !== "enabled"
            );

            if (!modifierIdeaKey) {
                continue;
            }

            // Only add if whitelisted
            if (!this.isWhitelisted(modifierIdeaKey)) {
                console.warn(`Skipping idea "${ideaKey}" with modifier "${modifierIdeaKey}" as it is not whitelisted`);
                continue;
            }

            // Look up modifier data from balanced ideas
            const balancedIdea = this.balancedIdeas.get(modifierIdeaKey);
            if (!balancedIdea) {
                console.warn(`Modifier "${modifierIdeaKey}" not found in balanced ideas, skipping`);
                continue;
            }

            const costPerLevel = balancedIdea.costs;
            const modifierValue = balancedIdea.value;
            const localization = balancedIdea.localization;
            
            // Collect metadata for caller to apply
            localisations.set(modifierIdeaKey, localization);
            interpretations.set(modifierIdeaKey, NumberKind.ADDITIVE);
            
            if (!categoryKeys.has(mana)) {
                categoryKeys.set(mana, []);
            }
            categoryKeys.get(mana)!.push(modifierIdeaKey);
            
            ideas.push(new Idea(new Modifier(mana, modifierIdeaKey, modifierValue), costPerLevel));
        }

        return { ideas, metadata: { localisations, interpretations, categoryKeys } };
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
                        costPerLevel.push(EU4Service.DEFAULT_CUSTOM_IDEA_COSTS_PER_LEVEL[i - 1]);
                    }
                }
                const modifierIdeaKey = Object.keys(ideaData).find(k => !k.startsWith("level_cost") && k != "max_level")!;
                const mana = category == "ADM" ? Mana.ADM : category == "DIP" ? Mana.DIP : Mana.MIL;
                let modifierValue = parseFloat(ideaData[modifierIdeaKey]);
                if (isNaN(modifierValue)) {
                    modifierValue = 1;
                }
                ideas.push(new Idea(new Modifier(mana, modifierIdeaKey, modifierValue), costPerLevel));
            }
        }
        return ideas;
    }

    public getIdeaIconImageUrl(ideaKey: string) {
        return "https://codingafterdark.de/mc/ideas/data/icons/" + ideaKey + ".webp";
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