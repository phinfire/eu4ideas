import { Component, ViewChild } from '@angular/core';
import { CdkAccordionModule } from '@angular/cdk/accordion';
import { CommonModule } from '@angular/common';
import { NatIdeaViewComponent } from '../nat-idea-view/nat-idea-view.component';
import { IconPoolComponent } from '../icon-pool/icon-pool.component';
import { EU4Service } from '../types/game/EU4Service';
import { IdeasConnector } from '../types/IdeasConnector';
import { IIconProvider } from '../types/keyedIcons/IIconProvider';
import { KeyedIcon } from '../types/keyedIcons/KeyedIcon';
import { UserConfigurationProvider } from '../types/UserConfigurationProvider';
import { ISelectConnector } from '../types/glue/ISelectConnectors';
import { TagSelectConnector } from '../types/glue/TagSelectConnector';

@Component({
  selector: 'app-ideas',
  imports: [CdkAccordionModule, CommonModule, NatIdeaViewComponent, IconPoolComponent],
  templateUrl: './ideas.component.html',
  styleUrls: ['./ideas.component.scss']
})
export class IdeasComponent {

  items = ["Nation","Ideas"];
  expandedIndex: number | null = 0;

  @ViewChild(NatIdeaViewComponent) natIdeaViewComponent!: NatIdeaViewComponent;

  nationProvider: IIconProvider;
  nationSelectConnector = new TagSelectConnector();

  constructor(public eu4: EU4Service, public lobbyConfigProvider: UserConfigurationProvider, public ideasConnector: IdeasConnector) {
    this.nationProvider = lobbyConfigProvider.getNationProvider();
  }

  ngOnInit() {
    this.nationSelectConnector.registerSelectionChangedListener(() => {
      const icons = this.nationProvider.getIcons().then(icons => {
        const match = icons.find(icon => this.nationSelectConnector.isSelected(icon.key));
        if (match) {
          this.natIdeaViewComponent.setNation(match.key, match.name, match.imageUrl);
        }
      });
    });
  }

  toggleAccordion(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }
}