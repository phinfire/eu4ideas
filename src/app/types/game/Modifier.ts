import { Mana } from "./EU4Service";

export class Modifier {

    constructor(private mana: Mana, private key: string, private modifier: number) {

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