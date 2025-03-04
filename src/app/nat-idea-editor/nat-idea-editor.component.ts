import { Component } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CK3Service } from '../types/CK3Service';
import { EU4Service } from '../types/EU4Service';
import { Idea } from '../types/Idea';

interface SliderConfig {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  showTicks: boolean;

  getImageUrl(): string;
  getCurrentCost(): number;
  getCurrentModifier(): string;
}

@Component({
  selector: 'app-nat-idea-editor',
  standalone: true,
  imports: [MatSliderModule, FormsModule, CommonModule],
  templateUrl: './nat-idea-editor.component.html',
  styleUrl: './nat-idea-editor.component.scss'
})
export class NatIdeaEditorComponent {

  sliders: SliderConfig[] = [];

  constructor(private eu4: EU4Service) {
    
  }

  ngOnInit() {
    this.eu4.waitForIdeas().then(() => {
      const customIdeas = this.eu4.getCustomIdeas();
      Array.from(customIdeas.get("ADM")!.values()).slice(0, 10).map((idea, index) => {
        this.sliders.push(this.getSliderConfig(idea));
      });
    });
  }

  
getSliderConfig(idea: Idea) {
  const outerThis = this;
  return {
    name: idea.getKey(),
    value: 1,
    min: 1,
    max: idea.getMaxCustomLevel(),
    step: 1,
    showTicks: true,
    getImageUrl: function() {
      return outerThis.eu4.getIdeaIconImageUrl(idea.getKey());
    },
    getCurrentCost: function() {
      return idea.getCostAtLevel(this.value);
    },
    getCurrentModifier: function() {
      const modifierAsNumber = idea.getModifierAtLevel(this.value);
      return modifierAsNumber.toFixed(3) == modifierAsNumber.toFixed(2) + "0" ? modifierAsNumber.toFixed(2) : modifierAsNumber.toFixed(3);
    }
  };
}

  onValueChange(event: any, index: number) {
    this.sliders[index].value = event;
  }

  getCustomLabel(value: number, div: HTMLDivElement) {
    div.innerHTML = value.toString();
  }

  getRealWorldCost(index: number, div: HTMLDivElement | null) {
    return this.sliders[index].getCurrentCost();
  }

  getTotalCost() {
    let total = 0;
    for (let i = 0; i < this.sliders.length; i++) {
      total += this.getRealWorldCost(i, null);
    }
    return total;
  }
}