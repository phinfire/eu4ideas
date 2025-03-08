import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdeaModifierTreeComponent } from './idea-modifier-tree/idea-modifier-tree.component';
import { NatIdeaViewComponent } from './nat-idea-view/nat-idea-view.component';

@Component({
  selector: 'app-root',
  imports: [NatIdeaViewComponent, IdeaModifierTreeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'eu4ideas';
}