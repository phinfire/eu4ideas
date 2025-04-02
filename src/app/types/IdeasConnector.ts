import { Injectable } from '@angular/core';
import { EU4Service } from './game/EU4Service';
import { Idea } from './game/Idea';
import { IIdea } from './game/IIdea';
import { ISelectConnector } from './glue/ISelectConnectors';
import { UserConfigurationProvider } from './UserConfigurationProvider';

@Injectable({
  providedIn: 'root'
})
export class IdeasConnector implements ISelectConnector{
  
  private selectedIdeas: Set<Idea> = new Set();
  private listeners: (() => void)[] = [];

  constructor(private lobbyConfigProvider: UserConfigurationProvider) {
    this.listeners.push(() => {
      localStorage.setItem("selectedIdeas", JSON.stringify(Array.from(this.selectedIdeas).map(idea => idea.getKey())));
    });
    const selectedKeys = JSON.parse(localStorage.getItem("selectedIdeas") || "[]");
    this.lobbyConfigProvider.waitUntilReady().then(() => {
      selectedKeys.forEach((key: string) => this.selectedIdeas.add(this.lobbyConfigProvider.getIdea(key)));
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
    return this.selectedIdeas.has(this.lobbyConfigProvider.getIdea(key));
  }

  setSelection(key: string, selected: boolean) {
    if (selected) {
      this.selectedIdeas.add(this.lobbyConfigProvider.getIdea(key));
    } else {
      this.selectedIdeas.delete(this.lobbyConfigProvider.getIdea(key));
    }
    this.listeners.forEach(listener => listener());
  }

  public canAlterSelection(key: string) {
    return this.selectedIdeas.size < 10 || this.selectedIdeas.has(this.lobbyConfigProvider.getIdea(key));
  }
}