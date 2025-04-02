import { Injectable } from "@angular/core";
import { Idea } from "./game/Idea";
import { IIconProvider } from "./keyedIcons/IIconProvider";
import { KeyedIcon } from "./keyedIcons/KeyedIcon";
import { EU4Service } from "./game/EU4Service";
import { Modifier } from "./game/Modifier";
import { Mana } from "./game/Mana";
import { IIdea } from "./game/IIdea";

interface IdeaAtLevel {
    ideaKey: string;
    level: number;
}

@Injectable({providedIn: 'root'})
export class UserConfigurationProvider {

    private minPercentageOfCost = 0.3;    
    private maxFromSingleMana = 4;
    private have1GetTheOtherFree = new Map<IdeaAtLevel, IdeaAtLevel[]>();
    private balancedIdeas = new Map<string, Idea>();

    constructor(private eu4: EU4Service) {
        this.eu4.waitUntilReady().then(() => {
            fetch("https://codingafterdark.de/mc/ideas/data/free.txt")
            .then(response => response.text())
            .then(data => {
                this.have1GetTheOtherFree = this.extractGet1Get1Free(data);
                fetch("https://codingafterdark.de/mc/ideas/data/balancedIdeas.txt")
                    .then(response => response.text())
                    .then(balancedData => {
                        this.balancedIdeas = this.extractBalancedIdeas(balancedData);
                    });
            });
        });
    }

    private extractGet1Get1Free(data: string) {
        const have1GetTheOtherFree = new Map<IdeaAtLevel, IdeaAtLevel[]>();
        for (let line of data.split("\n")) {
            const parts = line.split(";").map(part => part.trim());
            const have = parts[0].split("=").map(part => part.trim());
            const getsIdeasAtLevels = [];
            for (let i = 1; i < parts.length; i++) {
                
            }

        }
        return new Map<IdeaAtLevel, IdeaAtLevel[]>();
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

    isLegalConfiguration(headIdeas: IIdea[], levels: number[], preCalculatedManaPercentages: number[]) {
        if (preCalculatedManaPercentages.some(percentage => percentage > this.minPercentageOfCost)) {
            return "You have to select at least 25% of the cost from each mana type.";
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
            ideasPerMana.set(mana, ideasPerMana.get(mana)! + levels[i]);
        }
        if ([...ideasPerMana.values()].some(count => count > this.maxFromSingleMana)) {
            return "You can only select a maximum of " + this.maxFromSingleMana + " ideas from each mana type.";
        }
        return true;
    }

    getFreeBonus(idea: Idea, level: number) {
        const ideaKey = idea.getKey();
        const headIdeas = this.have1GetTheOtherFree.get({ideaKey: ideaKey, level: level});
        if (headIdeas) {
            return headIdeas.map(ideaAtLevel => ({idea: this.eu4.getIdea(ideaAtLevel.ideaKey), level: ideaAtLevel.level}));
        }
        return [];
    }
    
    public getCustomIdeaWeights() {
        return [2, 2, 1.8, 1.6, 1.4, 1,2, 1, 1, 1]
    }


    getMaxTotalNationIdeaCost() {
        return 175;
    }

    public getNationProvider(): IIconProvider {
        const configRootUrl = "https://codingafterdark.de/mc/ideas/flags/";
        class NationIconProvider implements IIconProvider {
            getIcons(): Promise<KeyedIcon[]> {
                return fetch(configRootUrl + "nations.json")
                    .then(response => response.json())
                    .then((json: any[]) => {
                        return json.map(entry => new KeyedIcon(entry.key, configRootUrl + entry.key + ".webp", entry.name));
                    });
            }
        }
        return new NationIconProvider();
    }

    public getIdea(key: string): Idea {
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
                    /*
                    let debugString = "";
                    const maxLocLength  = Math.max(...icons.map(i => outerThis.localizeIdea(i.key).length));
                    const maxIdeaKeyLength = Math.max(...icons.map(i => i.key.length));
                    for (let idea of [adm, dip, mil]) {
                        for (let i of idea.sort((a, b) => a.getKey().localeCompare(b.getKey()))) {
                            const key = i.getKey().padEnd(maxIdeaKeyLength);
                            const name = outerThis.localizeIdea(i.getKey()).padEnd(maxLocLength);
                            const costs = [1,2,3,4].slice(0, i.getMaxCustomLevel()).map(level => i.getCostAtLevel(level)).join("; ").padEnd(18);
                            const baseModifier = i.getModifierAtLevel(1).toString();
                            debugString += key + "; " + name + ";" + costs + ";" + baseModifier + "\n";
                        }
                    }
                    console.log(debugString);
                    */
                });
            }
        };
    }
}