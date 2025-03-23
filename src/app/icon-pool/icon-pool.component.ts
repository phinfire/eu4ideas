import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IdeasConnector } from '../types/IdeasConnector';
import { EU4Service } from '../types/game/EU4Service';
import { Idea } from '../types/game/Idea';
import { IIconProvider } from '../types/keyedIcons/IIconProvider';
import { KeyedIcon } from '../types/keyedIcons/KeyedIcon';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ISelectConnector } from '../types/glue/ISelectConnectors';

@Component({
  selector: 'app-icon-pool',
  imports: [CommonModule, MatTooltipModule, MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './icon-pool.component.html',
  styleUrl: './icon-pool.component.scss'
})
export class IconPoolComponent {

  filterText = "";
  private icons: KeyedIcon[] = [];
  @Input() iconProvider!: IIconProvider;
  @Input() connector!: ISelectConnector;

  private key_name = new Map<string, string>();

  constructor() {

  }

  ngOnInit() {
    this.iconProvider.getIcons().then(icons => {
      this.icons = icons;
      icons.forEach(icon => this.key_name.set(icon.key, icon.name));
    });
  }


  getIcons() {
    return this.icons.filter(icon => this.isVisible(icon.key));
  }

  isSelected(key: string) {
    return this.connector.isSelected(key);
  }

  onIconClick(key: string) {
    if (this.connector.canAlterSelection(key)) {
      this.connector.setSelection(key, !this.isSelected(key));
    }
  }

  isVisible(key: string) {
    return this.filterText.trim().length == 0
    || key.toLowerCase().includes(this.filterText.toLowerCase())
    || this.key_name.has(key) && this.key_name.get(key)!.toLowerCase().includes(this.filterText.toLowerCase());
  }

}