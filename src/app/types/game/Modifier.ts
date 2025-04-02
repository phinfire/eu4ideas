import { Mana } from "./Mana";

export class Modifier {

    constructor(private mana: Mana, private key: string, private modifier: number) {
        if (key.length == 0 || isNaN(modifier)) {
            throw new Error("Invalid key or modifier for Modifier: " + key + ", " + modifier);
        }
    }

    public getMana() {
        return this.mana;
    }

    public getKey() {
        return this.key;
    }

    public getModifierBaseValue() {
        return this.modifier;
    }
}