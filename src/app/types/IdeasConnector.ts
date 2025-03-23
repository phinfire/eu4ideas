import { Injectable } from '@angular/core';
import { EU4Service } from './game/EU4Service';
import { Idea } from './game/Idea';
import { IIdea } from './game/IIdea';
import { ISelectConnector } from './glue/ISelectConnectors';

@Injectable({
  providedIn: 'root'
})
export class IdeasConnector implements ISelectConnector{
  
  private selectedIdeas: Set<Idea> = new Set();
  private listeners: (() => void)[] = [];

  constructor(private eu4: EU4Service) {
    this.listeners.push(() => {
      localStorage.setItem("selectedIdeas", JSON.stringify(Array.from(this.selectedIdeas).map(idea => idea.getKey())));
    });
    const selectedKeys = JSON.parse(localStorage.getItem("selectedIdeas") || "[]");
    this.eu4.waitUntilReady().then(() => {
      selectedKeys.forEach((key: string) => this.selectedIdeas.add(this.eu4.getIdea(key)));
      this.listeners.forEach(listener => listener());
    });
  }

  registerSelectionChangedListener(listener: () => void) {
    this.listeners.push(listener);
  }

  getSelectedIdeas(): Set<IIdea> {
    return this.selectedIdeas;
  }

  getSelectedKeys(): Set<string> {
    return new Set(Array.from(this.selectedIdeas).map(idea => idea.getKey()));
  }

  isSelected(key: string) {
    return this.selectedIdeas.has(this.eu4.getIdea(key));
  }

  setSelection(key: string, selected: boolean) {
    if (selected) {
      this.selectedIdeas.add(this.eu4.getIdea(key));
    } else {
      this.selectedIdeas.delete(this.eu4.getIdea(key));
    }
    this.listeners.forEach(listener => listener());
  }

  public canAlterSelection(key: string) {
    return this.selectedIdeas.size < 10 || this.selectedIdeas.has(this.eu4.getIdea(key));
  }
}