import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IIconProvider } from '../types/keyedIcons/IIconProvider';
import { KeyedIcon } from '../types/keyedIcons/KeyedIcon';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ISelectConnector } from '../types/glue/ISelectConnectors';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-icon-pool',
  imports: [CommonModule, MatTooltipModule, MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './icon-pool.component.html',
  styleUrl: './icon-pool.component.scss'
})
export class IconPoolComponent {

  filterText = "";
  private icons: KeyedIcon[] = [];
  @Input() iconProvider!: IIconProvider;
  @Input() connector!: ISelectConnector;

  private key_name = new Map<string, string>();

  constructor(private snackBar: MatSnackBar) {

  }

  setIconProvider(iconProvider: IIconProvider) {
    this.iconProvider = iconProvider;
  }

  setConnector(connector: ISelectConnector) {
    this.connector = connector;
  }


  ngOnInit() {
    this.iconProvider.getIcons().then(icons => {
      this.icons = icons;
      console.log("Loaded icons: ", icons);
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
      this.connector.setSelected(key, !this.isSelected(key));
    }
  }
  
  onIconRightClick(event: MouseEvent, key: string) {
    event.preventDefault();
    navigator.clipboard.writeText(key).then(() => {
      this.snackBar.open('Icon key copied to clipboard!', 'Close', {
        duration: 500,
        verticalPosition: 'bottom',
        horizontalPosition: 'center'
      }); 
    }).catch(err => {
      console.error('Failed to copy key to clipboard: ', err);
    });
  }

  isVisible(key: string) {
    return this.filterText.trim().length == 0
    || key.toLowerCase().includes(this.filterText.toLowerCase())
    || this.key_name.has(key) && this.key_name.get(key)!.toLowerCase().includes(this.filterText.toLowerCase());
  }

  getTooltip(icon: KeyedIcon) {
    return icon.name;
  }

}