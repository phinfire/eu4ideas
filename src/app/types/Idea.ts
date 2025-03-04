export class Idea {

    constructor(private key: string, private modifier: number, private costPerLevel: number[]) {

    }

    public getKey() {
        return this.key;
    }

    public getCostAtLevel(level: number) {
        return this.costPerLevel[level - 1];
    }

    public getMaxCustomLevel() {
        return this.costPerLevel.length;
    }

    public getModifierAtLevel(level: number) {
        return this.modifier * level;
    }
        
}