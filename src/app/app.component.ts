import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NatIdeaEditorComponent } from './nat-idea-editor/nat-idea-editor.component';

@Component({
  selector: 'app-root',
  imports: [NatIdeaEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'eu4ideas';
}
