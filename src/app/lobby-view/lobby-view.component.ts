import { MatDialog } from '@angular/material/dialog';
import { IconPoolComponent } from '../icon-pool/icon-pool.component';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IIconProvider } from '../types/keyedIcons/IIconProvider';
import { KeyedIcon } from '../types/keyedIcons/KeyedIcon';
import { SelectConnector } from '../types/glue/SelectConnectors';
import { CanvasService } from '../canvas.service';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ExportService, IPlotable } from '../export.service';
import { FormsModule } from '@angular/forms';

export class DiscordUser {

    private avatarUrl: string;

    constructor(private name: string, private id: string, avatarUrl: string | null) {
        this.name = name;
        this.id = id;
        if (avatarUrl != null) {
            this.avatarUrl = avatarUrl;
        } else {
            this.avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
        }
    }

    public getName() {
        return this.name;
    }

    public getId() {
        return this.id;
    }

    public getAvatarUrl() {
        return this.avatarUrl;
    }
}

interface RowEntry {
    points: number;
    nationIconUrl: string | null
    nationName: string;
    playerIconUrl: string | null;
    playerName: string;
}

@Component({
    selector: 'app-lobby-view',
    imports: [CommonModule, MatTableModule, MatSortModule, MatTooltipModule, MatIconModule, FormsModule],
    templateUrl: './lobby-view.component.html',
    styleUrl: './lobby-view.component.scss'
})
export class LobbyViewComponent {

    rowEntries: RowEntry[] = [];

    displayedColumns: string[] = ["position", "points", "nationIconUrl", "nationName", "playerIconUrl", "playerName", "actions"];
    dataSource = new MatTableDataSource(this.rowEntries);

    playerNationIcons: KeyedIcon[] = [];
    discordUsers: DiscordUser[] = [];

    constructor(private dialog: MatDialog, private http: HttpClient, private exportService: ExportService, public canvasService: CanvasService) {
        this.http.get("https://codingafterdark.de/mc/ideas/flags/nations.json" + "?" + new Date().getTime()).subscribe((data: any) => {
            this.playerNationIcons = data.map((item: any) => new KeyedIcon(item.key, `https://codingafterdark.de/mc/ideas/flags/${item.key}.webp`, item.name));
        });
        this.http.get("https://codingafterdark.de/discord-api/guild/749686922959388752/users").subscribe((data: any) => {
            const userMap: DiscordUser[] = [];
            for (let key in data.users) {
                const userData = data.users[key];
                const avatarUrl = userData.avatar_url ? userData.avatar_url : null;
                userMap.push(new DiscordUser(userData.display_name, key, avatarUrl));
            }
            this.discordUsers = userMap;
        });
    }

    ngOnInit() {
        this.loadStateFromLocalStorage();
    }


    addRow(): void {
        const newRow: RowEntry = {
            points: 1,
            nationIconUrl: null,
            nationName: "New Nation",
            playerIconUrl: null,
            playerName: "New Player"
        };
        this.rowEntries.push(newRow);
        this.dataSource.data = [...this.rowEntries];
        this.storeCurrentStateinLocalStorage();
    }

    removeRow(index: number): void {
        this.rowEntries.splice(index, 1);
        this.dataSource.data = [...this.rowEntries];
        this.storeCurrentStateinLocalStorage();
    }

    onPointsChange(entry: RowEntry): void {
        setTimeout(() => {
            this.storeCurrentStateinLocalStorage();
        });
    }

    openNationIconPool(entry: RowEntry): void {
        const outer = this;
        const iconProvider = new class implements IIconProvider {
            getIcons(): Promise<KeyedIcon[]> {
                return Promise.resolve(outer.playerNationIcons);
            }

        };
        this.openPool(iconProvider, (icon: KeyedIcon | null) => {
            if (icon) {
                entry.nationIconUrl = icon.imageUrl;
                entry.nationName = icon.name;
                this.storeCurrentStateinLocalStorage();
            }
        });
    }

    openPlayerIconPool(entry: RowEntry) {
        const outer = this;
        const iconProvider = new class implements IIconProvider {
            getIcons(): Promise<KeyedIcon[]> {
                return Promise.resolve(outer.discordUsers.map(user => new KeyedIcon(user.getId(), user.getAvatarUrl(), user.getName())));
            }

        };
        this.openPool(iconProvider, (icon: KeyedIcon | null) => {
            if (icon) {
                entry.playerIconUrl = icon.imageUrl;
                entry.playerName = icon.name;
                this.storeCurrentStateinLocalStorage();
            }
        });
    }

    openPool(iconProvider: IIconProvider, selectionCallback: (icon: KeyedIcon | null) => void): void {
        const connector = new SelectConnector(1);
        const dialogRef = this.dialog.open(IconPoolComponent, {
            width: '50vw',
            height: '400px',
            data: {}
        });

        const instance = dialogRef.componentInstance;
        instance.iconProvider = iconProvider;
        instance.connector = connector;
        connector.registerSelectionChangedListener(() => {
            this.dialog.closeAll();
            if (connector.getSelectedKeys().size > 0) {
                iconProvider.getIcons().then(icons => {
                    const icon = icons.find(icon => icon.key === Array.from(connector.getSelectedKeys())[0])!;
                    selectionCallback(icon);
                });
            } else {
                selectionCallback(null);
            }
        });
    }

    storeCurrentStateinLocalStorage(): void {
        localStorage.setItem('lobbyViewState', JSON.stringify(this.rowEntries));
    }

    loadStateFromLocalStorage(): void {
        const storedState = localStorage.getItem('lobbyViewState');
        if (storedState) {
            this.rowEntries = JSON.parse(storedState);
            this.dataSource.data = [...this.rowEntries];
        }
    }

    print() {
        const plotables = [];
        for (let entry of this.rowEntries) {
            if (entry.nationIconUrl != null && entry.playerIconUrl != null) {
                plotables.push(new class implements IPlotable {
                    getPoints(): number {
                        return entry.points;
                    }
                    getNationName(): string {
                        return entry.nationName;
                    }
                    getPlayerName(): string {
                        return entry.playerName;
                    }
                    getNationImageUrl(): string {
                        return entry.nationIconUrl!;
                    }
                    getPlayerImageUrl(): string {
                        return entry.playerIconUrl!;
                    }

                })
            }
        }
        const userInput = prompt("Please enter a number:");
        if (userInput !== null) {
            const parsedNumber = parseInt(userInput, 10);
            if (!isNaN(parsedNumber)) {
                console.log(`You entered the number: ${parsedNumber}`);
            } else {
                console.error("Invalid input. Please enter a valid number.");
            }
        }
        const title = "Bündnispunkte für die "+ userInput + ". Session";
        this.exportService.exportAsImage(title, plotables, true).then((canvas) => {
            canvas.toBlob((blob) => {
                /*
                if (blob) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'canvas-image.png';
                link.click();
                URL.revokeObjectURL(link.href);
                }
                */
                if (blob) {
                    const newTab = window.open();
                    if (newTab) {
                        const blobUrl = URL.createObjectURL(blob);
                        newTab.document.body.innerHTML = `<img src="${blobUrl}" style="max-width: 100%; max-height: 100%;">`;
                        newTab.document.title = "Canvas Image";
                    }
                }
            });
        });
    }

    downloadState(): void {
        const stateJson = JSON.stringify(this.rowEntries, null, 2);
        const blob = new Blob([stateJson], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lobby-state-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    importState(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event: any) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e: any) => {
                    try {
                        const importedState = JSON.parse(e.target.result);
                        if (Array.isArray(importedState)) {
                            this.rowEntries = importedState;
                            this.dataSource.data = [...this.rowEntries];
                            this.storeCurrentStateinLocalStorage();
                            console.log('State imported successfully');
                        } else {
                            console.error('Invalid state format: expected an array');
                        }
                    } catch (error) {
                        console.error('Failed to import state:', error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}