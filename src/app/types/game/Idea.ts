import { IIdea } from "./IIdea";
import { Modifier } from "./Modifier";

export class Idea implements IIdea {

    constructor(private modifier: Modifier, private costPerLevel: number[]) {
        if (costPerLevel.length == 0 || costPerLevel.some(cost => isNaN(cost))) {
            throw new Error("Invalid costPerLevel array for modifier " + modifier.getKey() + ": " + costPerLevel + "(" + costPerLevel.length + ")");
        }
    }

    public getMana() {
        return this.modifier.getMana();
    }

    public getKey() {
        return this.modifier.getKey();
    }

    public getCostAtLevel(level: number) {
        return this.costPerLevel[level - 1];
    }

    public getMaxCustomLevel() {
        return this.costPerLevel.length;
    }

    public getModifierAtLevel(level: number) {
        return this.modifier.getModifierBaseValue() * level;
    }
        
}