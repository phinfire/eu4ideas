import { Injectable } from '@angular/core';
import { EU4Service } from './EU4Service';
import { Idea } from './Idea';

@Injectable({
  providedIn: 'root'
})
export class IdeasConnector {
  
  private ideas: Idea[] = [];
  private listeners: (() => void)[] = [];

  constructor(private eu4: EU4Service) {
    this.eu4.waitUntilReady().then(() => {
      const customIdeas = this.eu4.getCustomIdeas();
      Array.from(customIdeas.get("ADM")!.values()).slice(0, 10).map((idea, index) => {
        this.ideas.push(idea);
      });
      this.listeners.forEach(listener => listener());
    });
  }

  registerSelectionChangedListener(listener: () => void) {
    this.listeners.push(listener);
  }

  getSelectedIdeas(): Idea[] {
    return this.ideas;
  }

  toggleSelection(idea: Idea) {
    const index = this.ideas.findIndex(i => i === idea);
    if (index === -1) {
      this.ideas.push(idea);
    } else {
      this.ideas.splice(index, 1);
    }
    this.listeners.forEach(listener => listener());
  }
}