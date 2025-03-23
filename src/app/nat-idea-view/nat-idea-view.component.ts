import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { EU4Service, Mana, NumberKind } from '../types/game/EU4Service';
import { IIdea } from '../types/game/IIdea';
import { IdeasConnector } from '../types/IdeasConnector';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ISliderConfig, SliderConfig } from './ISliderConfig';
import { UserConfigurationProvider } from '../types/UserConfigurationProvider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExportService } from '../types/ExportService';

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

  constructor(private eu4: EU4Service, private exportService: ExportService, private userConfig: UserConfigurationProvider) {

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

  getSliders() {
    return this.sliders;
  }

  getChildren(slider: ISliderConfig) {
    return [];
    //return slider.value == slider.max ? [slider] : [];
  }

  getRealWorldCost(index: number, div: HTMLDivElement | null) {
    if (this.sliders[index] == null) {
      return 0; //TODO: remove
    }
    return Math.ceil(this.eu4.getCustomIdeaWeights()[index] * this.sliders[index].getCurrentCost());
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
    //moveItemInArray(this.sliders, event.previousIndex, event.currentIndex);
    const a = this.sliders[event.previousIndex];
    this.sliders[event.previousIndex] = this.sliders[event.currentIndex];
    this.sliders[event.currentIndex] = a;

    const b = this.entries[event.previousIndex];
    this.entries[event.previousIndex] = this.entries[event.currentIndex];
    this.entries[event.currentIndex] = b;
  }

  getManaIcon(index: number) {
    return this.eu4.getManaSymbol([Mana.ADM, Mana.DIP, Mana.MIL][index]);
  }

  getManaPercentage(index: number) {
    if (this.ideasConnector.getSelectedIdeas().size < 1) {
      return 0;
    }
    const mana = [Mana.ADM, Mana.DIP, Mana.MIL][index];
    const ideasOfThisType = Array.from(this.ideasConnector.getSelectedIdeas().values()).map(idea => idea.getMana()).filter(m => m == mana).length;
    return 100 * ideasOfThisType / this.ideasConnector.getSelectedIdeas().size;
  }

  isExportDisabled() {
    return this.ideasConnector.getSelectedIdeas().size != 10 || this.getTotalCost() > this.getMaxLegalCost();
  }

  getExportTooltip() {
    if (this.isExportDisabled()) {
      return "You must select exactly 10 ideas and the total cost must not exceed " + this.getMaxLegalCost();
    } else {
      return "Click to download the ideas as a text file";
    }
  }

  onExportClick() {
    const result = this.exportService.getIdeaString(this.nationTag, Array.from(this.ideasConnector.getSelectedIdeas().values()), this.sliders.map(slider => slider!.value));
    console.log(result);
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
}