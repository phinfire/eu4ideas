import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { EU4Service, NumberKind } from '../types/EU4Service';
import { IIdea } from '../types/IIdea';
import { IdeasConnector } from '../types/IdeasConnector';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ISliderConfig, SliderConfig } from './ISliderConfig';
import { Idea } from '../types/Idea';

@Component({
  selector: 'app-nat-idea-view',
  imports: [MatSliderModule, FormsModule, CommonModule, DragDropModule],
  templateUrl: './nat-idea-view.component.html',
  styleUrl: './nat-idea-view.component.scss'
})
export class NatIdeaViewComponent {

  sliders: ISliderConfig[] = [];
  traditions: IIdea[] = [];
  ideas: IIdea[] = [];
  ambition: IIdea[] = [];

  private previouslySetIdeaValues: Map<string, number> = new Map();

  constructor(private eu4: EU4Service, private connector: IdeasConnector) {

  }

  ngOnInit() {
    this.connector.registerSelectionChangedListener(() => {
      this.sliders = this.connector.getSelectedIdeas().map(idea => {
        const value = this.previouslySetIdeaValues.get(idea.getKey()) || 1;
        return new SliderConfig(idea, this.eu4, value);
      });
    });
  }

  getSliders() {
    return this.sliders;
  }

  getChildren(slider: ISliderConfig) {
    return slider.value == slider.max ? [slider] : [];
  }

  getRealWorldCost(index: number, div: HTMLDivElement | null) {
    return Math.ceil(this.eu4.getCustomIdeaWeights()[index] * this.sliders[index].getCurrentCost());
  }

  getTotalCost() {
    let total = 0;
    for (let i = 0; i < this.sliders.length; i++) {
      total += this.getRealWorldCost(i, null);
    }
    return total;
  }

  getImageUrl(key: string) {
    return this.eu4.getIdeaIconImageUrl(key);
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.sliders, event.previousIndex, event.currentIndex);
  }
}