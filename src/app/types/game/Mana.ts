export class Mana {

    private static imageRoot = "https://codingafterdark.de/mc/ideas";

    public static readonly ADM = new Mana("ADM", "icon_powers_administrative.webp");
    public static readonly DIP = new Mana("DIP", "icon_powers_diplomatic.webp");
    public static readonly MIL = new Mana("MIL", "icon_powers_military.webp");

    private constructor(private name: string, private iconFile: string) {

    }

    public getIconUrl(): string {
        return "https://codingafterdark.de/mc/ideas/" + this.iconFile;
    }

    public getName(): string {
        return this.name;
    }
}