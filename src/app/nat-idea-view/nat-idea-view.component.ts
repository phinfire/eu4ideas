import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { EU4Service } from '../types/game/EU4Service';
import { IIdea } from '../types/game/IIdea';
import { IdeasConnector } from '../types/IdeasConnector';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ISliderConfig, SliderConfig } from './ISliderConfig';
import { UserConfigurationProvider } from '../types/UserConfigurationProvider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Mana } from '../types/game/Mana';

@Component({
  selector: 'app-nat-idea-view',
  imports: [MatSliderModule, FormsModule, CommonModule, DragDropModule, MatTooltipModule],
  templateUrl: './nat-idea-view.component.html',
  styleUrl: './nat-idea-view.component.scss'
})
export class NatIdeaViewComponent {

  private sliders: (ISliderConfig | null)[] = [];
  private entries: (IIdea | null)[] = Array.from({ length: 10 }, () => null);

  private previouslySetIdeaValues: Map<string, number> = new Map();

  @Input() ideasConnector!: IdeasConnector;

  nationName: string = "";
  nationTag: string = "";
  nationFlagImageUrl: string = "";

  constructor(private eu4: EU4Service, private userConfig: UserConfigurationProvider) {
    this.loadPreviouslySetIdeaValuesFromLocalStorage();
  }

  ngOnInit() {
    this.ideasConnector.registerSelectionChangedListener(() => this.refreshSliders());
    this.refreshSliders();
  }

  private refreshSliders() {
    const newSelection = this.ideasConnector.getSelectedIdeas();
      const adddedIdeas = Array.from(newSelection).filter(idea => !this.entries.includes(idea));
      if (adddedIdeas.length > 0) {
        for (let adddedIdea of adddedIdeas) {
          for (let i = 0; i < this.entries.length; i++) {
            if (this.entries[i] == null) {
              this.entries[i] = adddedIdea;
              break;
            }
          }
        }
      } else {
        for (let i = 0; i < this.entries.length; i++) {
          if (this.entries[i] != null && !newSelection.has(this.entries[i]!)) {
            this.previouslySetIdeaValues.set(this.entries[i]!.getKey(), this.sliders[i]!.value);
            this.entries[i] = null;
          }
        }
      }
      const newSliders = [];
      for (let i = 0; i < this.entries.length; i++) {
        if (this.entries[i] == null) {
          newSliders.push(null);
        } else {
          let value = this.previouslySetIdeaValues.get(this.entries[i]!.getKey()) || 1;
          if (this.sliders[i] != null) {
            value = this.sliders[i]!.value;
          }
          newSliders.push(new SliderConfig(this.entries[i]!, this.eu4, value));
        }
      }
      this.sliders = newSliders;
  }

  getIdeaAtIndex(index: number) {
    return this.entries[index];
  }

  getIdeasInOrder() {
    return this.entries.map((idea, index) => {
      if (idea == null) {
        return null;
      }
      return { idea, level: this.sliders[index]!.value };
    }).filter(idea => idea != null);
  }

  getSliders() {
    return this.sliders;
  }

  getChildren(slider: ISliderConfig) {
    return [];
    //return slider.value == slider.max ? [slider] : [];
  }

  getRealWorldCost(index: number, div: HTMLDivElement | null) {
    if (this.sliders[index] == null) {
      return 0;
    }
    return Math.ceil(this.userConfig.getCustomIdeaWeights()[index] * this.sliders[index].getCurrentCost());
  }

  getTotalCost() {
    let total = 0;
    for (let i = 0; i < this.sliders.length; i++) {
      total += this.getRealWorldCost(i, null);
    }
    return total;
  }

  getMaxLegalCost() {
    return this.userConfig.getMaxTotalNationIdeaCost();
  }

  getImageUrl(key: string) {
    return this.eu4.getIdeaIconImageUrl(key);
  }

  drop(event: CdkDragDrop<string[]>) {
    const a = this.sliders[event.previousIndex];
    this.sliders[event.previousIndex] = this.sliders[event.currentIndex];
    this.sliders[event.currentIndex] = a;

    const b = this.entries[event.previousIndex];
    this.entries[event.previousIndex] = this.entries[event.currentIndex];
    this.entries[event.currentIndex] = b;
  }

  getManaIcon(index: number) {
    return [Mana.ADM, Mana.DIP, Mana.MIL][index].getIconUrl();
  }

  getManaPercentages() {
    if (this.ideasConnector.getSelectedIdeas().size < 1) {
      return [0, 0, 0];
    }
    const costPerMana = [Mana.ADM, Mana.DIP, Mana.MIL].map(mana => {
      return Array.from(this.getSliders()).map(slider => {
        if (slider == null || slider.getIdea().getMana() != mana) {
          return 0;
        }
        return slider.getIdea().getCostAtLevel(slider.value);
      }).reduce((a, b) => a + b, 0);
    });
    const totalCost = costPerMana.reduce((a, b) => a + b, 0);
    return costPerMana.map(cost => {
      if (totalCost == 0) {
        return 0;
      }
      return Math.floor(cost / totalCost * 100);
    });
  }

  getManaPercentage(index: number) {
    /*
    if (this.ideasConnector.getSelectedIdeas().size < 1) {
      return 0;
    }
    const mana = [Mana.ADM, Mana.DIP, Mana.MIL][index];
    const ideasOfThisType = Array.from(this.ideasConnector.getSelectedIdeas().values()).map(idea => idea.getMana()).filter(m => m == mana).length;
    return 100 * ideasOfThisType / this.ideasConnector.getSelectedIdeas().size;
    */
    return this.getManaPercentages()[index];
  }

  setNation(tag: string, name: string, flagImageUrl: string) {
    this.nationTag = tag;
    this.nationName = name;
    this.nationFlagImageUrl = flagImageUrl;
  }

  getTitleText() {
    if (this.nationName == "") {
      return "...";
    }
    return this.nationName + "'s National Ideas";
  }

  reportValueChange() {
    this.sliders.filter(slider => slider != null).forEach(slider => {
      this.previouslySetIdeaValues.set(slider!.getKey(), slider!.value);
    });
    this.storePreviouslySetIdeaValuesInLocalStorage();
  }

  storePreviouslySetIdeaValuesInLocalStorage() {
    localStorage.setItem("previouslySetIdeaValues", JSON.stringify(Array.from(this.previouslySetIdeaValues.entries())));
  }

  loadPreviouslySetIdeaValuesFromLocalStorage() {
    const previouslySetIdeaValues = localStorage.getItem("previouslySetIdeaValues");
    if (previouslySetIdeaValues) {
      this.previouslySetIdeaValues = new Map(JSON.parse(previouslySetIdeaValues));
    }
  }

  onIdeaIconClick(slider: ISliderConfig) {
    this.ideasConnector.setSelection(slider.getIdea().getKey(), false);
  }
}