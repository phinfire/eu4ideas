import { Injectable } from "@angular/core";
import { Idea } from "./game/Idea";
import { Mana } from "./game/EU4Service";
import { Modifier } from "./game/Modifier";
import { IIconProvider } from "./keyedIcons/IIconProvider";
import { KeyedIcon } from "./keyedIcons/KeyedIcon";

interface IdeaAtLevel {
    ideaKey: string;
    level: number;
}

@Injectable({providedIn: 'root'})
export class UserConfigurationProvider {
    
    private ideaCostOverrides = new Map<string, number[]>();
    private buyOneGetOneFreeLookup = new Map<IdeaAtLevel[], IdeaAtLevel>();
    private rebalancedCostsLookup = new Map<string, number[]>();

    constructor() {

    }

    getMaxTotalNationIdeaCost() {
        return 200;
    }

    getWithConfigurationApplied(ideas: Idea[], levels: number[]) {
        const result = [];
        for (let i = 0; i < ideas.length; i++) {
            const idea = ideas[i];
            for (let j = 0; j < ideas.length; j++) {
                const precedingIdea = ideas[j];
                const free = this.getSomethingFree(idea.getKey(), precedingIdea.getKey(), levels[i], levels[j]);
                if (free) {
                    
                } else {
                    result.push(idea);
                }
            }
            
        }
        return result;
    }

    private getSomethingFree(firstIdeakey: string, secondIdeaKey: string, firstLevel: number, secondLevel: number) {
        const lexSmallerIdeakey = firstIdeakey < secondIdeaKey ? firstIdeakey : secondIdeaKey;
        const lexGreaterIdeakey = firstIdeakey < secondIdeaKey ? secondIdeaKey : firstIdeakey;
        const key = [{ideaKey: lexSmallerIdeakey, level: firstLevel}, {ideaKey: lexGreaterIdeakey, level: secondLevel}];
        const free = this.buyOneGetOneFreeLookup.get(key);
        if (free) {
            return new Idea(new Modifier(Mana.ADM, free.ideaKey, 0), []);
        }
        return null;
    }

    public getNationProvider() {
        return new class implements IIconProvider {
            getIcons(): Promise<KeyedIcon[]> {
                return new Promise(resolve => resolve([
                    {key: "Z00", imageUrl: "https://codingafterdark.de/mc/ideas/flags/Z00.webp", name: "Greater Elbia"},
                    {key: "Z04", imageUrl: "https://codingafterdark.de/mc/ideas/flags/Z04.webp", name: "Vektec"},
                    {key: "Z02", imageUrl: "https://codingafterdark.de/mc/ideas/flags/Z02.webp", name: "Russia"}
                ]));
            }
        };
    }
}