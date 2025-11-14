import { Component, inject, ViewChild } from '@angular/core';
import { IIdea } from '../types/game/IIdea';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { ImportExportService } from '../types/ImportExportService';
import { UserConfigurationProvider } from '../types/UserConfigurationProvider';
import { KeyedIcon } from '../types/keyedIcons/KeyedIcon';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { IdeaAtLevel } from '../types/IdeaAtLevel';
import { CustomNatIdeaService } from '../types/game/CustomNatIdeaService';

interface RowEntry {
  ideas: IIdea[];
  icon: KeyedIcon;
}

@Component({
  selector: 'app-nat-ideas-overview',
  imports: [CommonModule, MatTableModule, MatSortModule, MatTooltipModule],
  templateUrl: './nat-ideas-overview.component.html',
  styleUrl: './nat-ideas-overview.component.scss'
})

export class NatIdeasOverviewComponent {

  rowEntries: RowEntry[] = [];
  uploadedIdeaSets: Map<string, IdeaAtLevel[]> = new Map<string, IdeaAtLevel[]>();
  localisations: Map<string, string> = new Map<string, string>();

  displayedColumns: string[] = ["position","tag", "icon", "name", "admMana", "dipMana", "milMana", "totalIdeaCost", "legal"];
  dataSource = new MatTableDataSource(this.rowEntries);

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private ideaService: CustomNatIdeaService, private importExportService: ImportExportService, private sessionConfigProvider: UserConfigurationProvider) {

  }

  ngAfterViewInit() {
    this.sessionConfigProvider.getNationProvider().getIcons().then(icons => {
      this.rowEntries = icons.map(icon => {
        return {
          ideas: [],
          icon: icon
        };
      }).sort((a, b) => {
        return a.icon.key.localeCompare(b.icon.key);
      });
      this.dataSource = new MatTableDataSource(this.rowEntries);
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case "tag": return item.icon.key.toLowerCase();
          case 'name': return item.icon.name.toLowerCase();
          case "admMana": return this.getManaPercentage(item.icon.key, 0);
          case "dipMana": return this.getManaPercentage(item.icon.key, 1);
          case "milMana": return this.getManaPercentage(item.icon.key, 2);
          case 'totalIdeaCost': return this.getTotalCost(item.icon.key);
          case 'legal': return this.hasEnteredLegalIdeas(item.icon.key) ? 1 : 0;
          default: return '';
        }
      };
      this.dataSource.sort = this.sort;
    }); 
  }

  public import(results: Map<string,{ideas: IdeaAtLevel[], loc: Map<string,string>}>) {
    for (let [tag, { ideas, loc }] of results) {
      this.uploadedIdeaSets.set(tag, ideas);
      for (let locKey of loc.keys()) {
        this.localisations.set(locKey, loc.get(locKey)!);
      }
    }
  }

  getManaPercentage(tag: string, manaIndex: number) {
    if (!this.uploadedIdeaSets.has(tag)) {
      return 0;
    }
    return this.ideaService.getManaPercentages(this.uploadedIdeaSets.get(tag)!)[manaIndex];
  }

  getTotalCost(tag: string) {
    if (!this.uploadedIdeaSets.has(tag)) {
      return 0;
    }
    return this.ideaService.getTotalCost(this.uploadedIdeaSets.get(tag)!);
  }

  hasEnteredLegalIdeas(tag: string) {
    return this.getReason(tag) == null;
  }

  getReason(tag: string) {
    if (!this.uploadedIdeaSets.has(tag)) {
      return "No idea set uploaded";
    }
    const ideasAndLevels = this.uploadedIdeaSets.get(tag)!;
    const ideas = ideasAndLevels.map(idea => idea.getIdea());
    const levels = ideasAndLevels.map(idea => idea.getLevel());
    return this.sessionConfigProvider.getIllegalIdeaErrorMessageIfExists(ideas, levels, this.ideaService.getManaPercentages(ideasAndLevels));
  }

  export() {
    let ideaString = "";
    for (let tag of this.uploadedIdeaSets.keys()) {
      const ideas = this.uploadedIdeaSets.get(tag)!.map(idea => {
        return [idea];
      });
      ideaString += this.importExportService.getIdeaString(tag, ideas) + "\n"
    }
    
    const blob = new Blob([ideaString], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '!!!_player_nat_ideas.txt';
    a.click();
    window.URL.revokeObjectURL(url);
    this.sessionConfigProvider.getNationProvider().getIcons().then(icons => {
      const nameLookup = new Map<string, string>();
      for (let icon of icons) {
        nameLookup.set(icon.key, icon.name);
      }
      return nameLookup;
    }).then(nameLookup => {
      for (let language of ["english", "german"]) {
        const loc = this.importExportService.toLoc(this.localisations).split("\n").map(line => {
          if (line.startsWith(" ")) {
              return line;
          } else {
            return " " + line;
          }
        }).join("\n");
        let fullSetTraditionsAmbitionsLoc = "";
        for (let tag of this.uploadedIdeaSets.keys()) {
          const ideas = this.uploadedIdeaSets.get(tag)!;
          const locs = this.importExportService.getNonStandardIdeaLocalisations(tag, nameLookup, language == "german");
          fullSetTraditionsAmbitionsLoc += "\n" + locs;
        }
        const finalLoc = "l_" + language + ":\n" + loc + "\n" + fullSetTraditionsAmbitionsLoc;
        const locWithBom = `\uFEFF${finalLoc}`;
        const locBlob = new Blob([locWithBom], { type: 'text/plain' });
        const locUrl = window.URL.createObjectURL(locBlob);
        const locA = document.createElement('a');
        locA.href = locUrl;
        locA.download = '!!!_player_nat_ideas_l_' + language + '.yml';
        locA.click();
        window.URL.revokeObjectURL(locUrl);
      }
    });
  }
}