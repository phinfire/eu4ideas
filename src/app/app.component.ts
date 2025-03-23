import { Component } from '@angular/core';
import { IdeasComponent } from './ideas/ideas.component';

@Component({
  selector: 'app-root',
  imports: [IdeasComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'eu4ideas';
}