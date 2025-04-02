import { EU4Service, NumberKind } from "../types/game/EU4Service";
import { IIdea } from "../types/game/IIdea";

export interface ISliderConfig {
  value: number;
  max: number;

  getKey(): string;
  getImageUrl(): string;
  getCurrentCost(): number;
  getCurrentModifier(): string;
  getName(): string;
  getIdea(): IIdea;
  getIdeaIconTooltip(): string;
}

export class SliderConfig implements ISliderConfig {
  max: number;

  constructor(private idea: IIdea, private eu4: EU4Service, public value: number) {
    this.max = idea.getMaxCustomLevel();
  }

  getName(): string {
    return this.eu4.localizeIdea(this.idea.getKey());
  }

  getIdea() {
    return this.idea;
  }

  getKey(): string {
    return this.idea.getKey();
  }
  getImageUrl(): string {
    return this.eu4.getIdeaIconImageUrl(this.idea.getKey());
  }
  getCurrentCost(): number {
    return this.idea.getCostAtLevel(this.value);
  }

  formatModifierNumber(modifierAsNumber: number): string {
    const type = this.eu4.getTypeOfIdea(this.idea.getKey());
    if (type == NumberKind.ADDITIVE) {
      if (Math.floor(modifierAsNumber) == modifierAsNumber) {
        return modifierAsNumber.toFixed(0);
      }
      return modifierAsNumber.toFixed(3) == modifierAsNumber.toFixed(2) + "0" ? modifierAsNumber.toFixed(2) : modifierAsNumber.toFixed(3);
    } else if (type == NumberKind.MULTIPLICATIVE) {
      const percentage = (modifierAsNumber * 100);
      if (Math.floor(percentage) == percentage) {
        return percentage.toFixed(0) + "%";
      }
      return percentage.toFixed(1) + "%";
    } else if (type == NumberKind.CONSTANT) {
      return modifierAsNumber.toString();
    } else {
      return modifierAsNumber.toString();
    }
  }

  getCurrentModifier(): string {
    const modifierAsNumber = this.idea.getModifierAtLevel(this.value);
    return this.formatModifierNumber(modifierAsNumber);
  }

  getIdeaIconTooltip(): string {
    return "Click to remove idea"
  }
}