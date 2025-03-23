import { IIdea } from "./IIdea";

export class BalancedIdea implements IIdea {
    getKey(): string {
        throw new Error("Method not implemented.");
    }
    getCostAtLevel(level: number): number {
        throw new Error("Method not implemented.");
    }
    getMaxCustomLevel(): number {
        throw new Error("Method not implemented.");
    }
    getModifierAtLevel(level: number): number {
        throw new Error("Method not implemented.");
    }

}