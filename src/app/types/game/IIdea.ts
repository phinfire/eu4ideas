import { Mana } from "./Mana";

export interface IIdea {

    getMana(): Mana;

    getKey(): string;

    getCostAtLevel(level: number): number;

    getMaxCustomLevel(): number;

    getModifierAtLevel(level: number): number;
}