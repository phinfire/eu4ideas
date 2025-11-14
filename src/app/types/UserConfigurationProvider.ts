import { Injectable } from "@angular/core";
import { Idea } from "./game/Idea";
import { IIconProvider } from "./keyedIcons/IIconProvider";
import { KeyedIcon } from "./keyedIcons/KeyedIcon";
import { EU4Service } from "./game/EU4Service";
import { Modifier } from "./game/Modifier";
import { Mana } from "./game/Mana";
import { IIdea } from "./game/IIdea";
import { IdeaAtLevel } from "./IdeaAtLevel";

@Injectable({providedIn: 'root'})
export class UserConfigurationProvider {

    private minPercentageOfCost = 25;    
    private maxFromSingleMana = 4;
    private have1GetTheOtherFree = new Map<string, IdeaAtLevel[]>();
    private balancedIdeas = new Map<string, Idea>();

    constructor(private eu4: EU4Service) {
        this.eu4.waitUntilReady().then(() => {
            fetch("https://codingafterdark.de/mc/ideas/data/free.txt" + "?" + new Date().getTime())
            .then(response => response.text())
            .then(data => {
                this.have1GetTheOtherFree = this.extractGet1Get1Free(data);
                fetch("https://codingafterdark.de/mc/ideas/data/balancedIdeas.txt")
                    .then(response => response.text())
                    .then(balancedData => {
                        const extracted = this.extractBalancedIdeas(balancedData);
                        for (let [key, idea] of extracted) {
                            const noGoIncludes = [
                                "_not_", "dice", "own_coast", "attack_bonus", "all_power_cost", "capped", "tactics",
                                 "monarch_admin_power",  "monarch_diplomatic_power", "monarch_military_power"
                            ];
                            if (noGoIncludes.some(ng => key.includes(ng))) {
                                continue;
                            }
                            this.balancedIdeas.set(key, idea);
                        }
                    });
            });
        });
    }

    private extractGet1Get1Free(data: string) {
        const have1GetTheOtherFree = new Map<string, IdeaAtLevel[]>();
        for (let line of data.split("\n")) {
            if (line.startsWith("#") || line.trim().length == 0) {
                continue;
            }
            const parts = line.split(";").map(part => part.trim());
            const have = parts[0].split("=").map(part => part.trim());
            const haveIdeaKey = have[0].trim();
            const getsIdeasAtLevels = [];
            for (let i = 1; i < parts.length; i++) {
                const freeIdeaKey = parts[i].split("=")[0].trim();
                if (parts[i].split("=")[1].trim() == "yes") {
                    getsIdeasAtLevels.push(new IdeaAtLevel(this.getIdea(freeIdeaKey), 1));
                } else {
                    const modifier = parseFloat(parts[i].split("=")[1].trim());
                    const baseModifier = this.getIdea(freeIdeaKey).getModifierAtLevel(1);
                    const freeLevel = this.calculateLevelFromModifiers(baseModifier, modifier);
                    getsIdeasAtLevels.push(new IdeaAtLevel(this.getIdea(freeIdeaKey), freeLevel));
                }
            }
            const haveModifier = parseFloat(have[1].trim());
            const baseModifier = this.getIdea(haveIdeaKey).getModifierAtLevel(1);
            const haveLevel = this.calculateLevelFromModifiers(baseModifier, haveModifier);
            const haveIdeaAtLevel = haveIdeaKey + haveLevel;
            have1GetTheOtherFree.set(haveIdeaAtLevel, getsIdeasAtLevels);
        }
        return have1GetTheOtherFree;
    }

    public calculateLevelFromModifiers(baseModifier: number, modifier: number) {
        const level = Math.round(modifier / baseModifier);
        if (Number.isNaN(level)) {
            throw new Error("Invalid level calculated from baseModifier " + baseModifier + " and modifier " + modifier);
        }
        if (!Number.isInteger(level)) {
            throw new Error("Level is not an integer: " + level + " from baseModifier " + baseModifier + " and modifier " + modifier);
        }
        return level;
    }
    
    private extractBalancedIdeas(data: string) {
        const balancedIdeas = new Map<string, Idea>();
        for (let line of data.split("\n")) {
            const parts = line.split(";").map(part => part.trim()).filter(part => part.length > 0);
            if (parts.length < 4) {
                continue;
            }
            const key = parts[0];
            try {
                const mana = this.eu4.getIdea(key).getMana();
                const name = parts[1];
                const baseModifier = parseFloat(parts[parts.length - 1]);
                const modifier = new Modifier(mana, key, baseModifier);
                const costsAtLevelList = parts.slice(2, parts.length - 1).map(part => parseFloat(part));
                const balancedIdea = new Idea(modifier, costsAtLevelList);
                balancedIdeas.set(key, balancedIdea);
            } catch (e) {
                console.log("Error parsing line: [" + parts.join(";") + "]\n", e);
            }
        }
        return balancedIdeas;
    }

    getIllegalIdeaErrorMessageIfExists(headIdeas: IIdea[], levels: number[], preCalculatedManaPercentages: number[]) {
        for (let i = 0; i < 3; i++) {
            const manaPercentage = preCalculatedManaPercentages[i];
            if (manaPercentage < this.minPercentageOfCost) {
                return "You have to select at least 25% (of total base cost) " + [Mana.ADM,Mana.DIP,Mana.MIL][preCalculatedManaPercentages.indexOf(manaPercentage)].getName() + " ideas.";
            }
        }
        if (headIdeas.length !== levels.length || headIdeas.length != 10) {
            return "Please select exactly 10 ideas.";
        }
        const totalCost = headIdeas.reduce((sum, idea, index) => sum + idea.getCostAtLevel(levels[index]), 0);
        if (totalCost > this.getMaxTotalNationIdeaCost()) {
            return "You have to select ideas with a total cost of at most " + this.getMaxTotalNationIdeaCost() + ".";
        }
        const ideasPerMana = new Map<Mana, number>();
        for (let i = 0; i < headIdeas.length; i++) {
            const idea = headIdeas[i];
            const mana = idea.getMana();
            if (!ideasPerMana.has(mana)) {
                ideasPerMana.set(mana, 0);
            }
            ideasPerMana.set(mana, ideasPerMana.get(mana)! + 1);
        }
        for (let mana of ideasPerMana.keys()) {
            if (ideasPerMana.get(mana)! > this.maxFromSingleMana) {
                return "You have " + ideasPerMana.get(mana)! + " ideas of type " + mana.getName() + ", but you can only select " + this.maxFromSingleMana + ".";
            }
        }
        
        return null;
    }

    getFreeBonus(idea: IIdea, level: number) {
        const ideaKey = idea.getKey();
        if (this.have1GetTheOtherFree.has(ideaKey)) {
            return this.have1GetTheOtherFree.get(ideaKey + level)!
        }
        return [];
    }
    
    public getCustomIdeaWeights() {
        return [2, 2, 
            2, 1.8, 1.6, 1.4, 1.2, 1, 1,
            1]
    }


    getMaxTotalNationIdeaCost() {
        return 175;
    }

    public getNationProvider(): IIconProvider {
        const configRootUrl = "https://codingafterdark.de/mc/ideas/flags/";
        class NationIconProvider implements IIconProvider {
            getIcons(): Promise<KeyedIcon[]> {
                return fetch(configRootUrl + "nations.json" + "?" + new Date().getTime())
                    .then(response => response.json())
                    .then((json: any[]) => {
                        return json.map(entry => new KeyedIcon(entry.key, configRootUrl + entry.key + ".webp", entry.name));
                    });
            }
        }
        return new NationIconProvider();
    }

    public getIdea(key: string): Idea {
        if (!this.balancedIdeas.has(key)) {
            return this.eu4.getIdea(key);
        }
        return this.balancedIdeas.get(key)!;
    }

    public waitUntilReady() {
            return new Promise<void>((resolve) => {
                const checkIfReady = () => {
                    if (this.balancedIdeas.size > 0) {
                        resolve();
                    } else {
                        setTimeout(checkIfReady, 100);
                    }
                };
                checkIfReady();
            });
    }
    
    public getIdeaIconProvider() {
        const outerThis = this;
        return new class implements IIconProvider {
            getIcons(): Promise<KeyedIcon[]> {
                return outerThis.waitUntilReady().then(() => {
                    const ideas = Array.from(outerThis.balancedIdeas.values());
                    ideas.sort((a, b) => outerThis.eu4.localizeIdea(a.getKey()).localeCompare(outerThis.eu4.localizeIdea(b.getKey())));
                    ideas.sort((a, b) => a.getMana().getName().localeCompare(b.getMana().getName()));
                    return ideas.map(idea => {
                        return new KeyedIcon(idea.getKey(), outerThis.eu4.getIdeaIconImageUrl(idea.getKey()), outerThis.eu4.localizeIdea(idea.getKey()));
                    });
                });
            }
        };
    }
}