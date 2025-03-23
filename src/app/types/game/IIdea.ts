import { Mana } from "./EU4Service";

export interface IIdea {

    getMana(): Mana;

    getKey(): string;

    getCostAtLevel(level: number): number;

    getMaxCustomLevel(): number;

    getModifierAtLevel(level: number): number;
}