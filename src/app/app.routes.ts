import { Routes } from '@angular/router';
import { IdeasComponent } from './ideas/ideas.component';
import { LobbyViewComponent } from './lobby-view/lobby-view.component';
import { GraphviewComponent } from './graphview/graphview.component';
import { NatIdeasOverviewComponent } from './nat-ideas-overview/nat-ideas-overview.component';

export const routes: Routes = [
    { path: '', component: IdeasComponent },
    { path: 'points', component: LobbyViewComponent },
    { path : 'plot', component: GraphviewComponent },
    { path: "admin", component: NatIdeasOverviewComponent}
];
