import { Injectable } from "@angular/core";
import { Jomini } from "jomini";
import JSZip from "jszip";
import { Idea } from "./Idea";

@Injectable({providedIn: 'root'})
export class EU4Service {

    private readonly rootUrl = "https://codingafterdark.de/ide/";

    private ideas: Map<string,Map<string,Idea>> = new Map();

    constructor() {
        fetch("https://codingafterdark.de/ide/custom_ideas.zip")
            .then(response => response.blob())
            .then(data => {
                const zip = new JSZip();
                Jomini.initialize().then((parser) => {
                    zip.loadAsync(data).then((contents) => {
                        for (const key in contents.files) {
                            contents.files[key].async("text").then((text) => {
                                this.extractIdeas(parser.parseText(text));
                            });
                        }
                    });
                });
            });
    }

    public extractIdeas(parsed: any) {
        for (let key of Object.keys(parsed)) {
            const category = parsed[key].category;
            for (let natIdeaName of Object.keys(parsed[key]).filter(k => k != "category")) {
                const ideaData = parsed[key][natIdeaName];
                const maxLevel = ideaData.max_level ? parseInt(ideaData.max_level) : 4;
                const costPerLevel = [];
                for (let i = 1; i <= maxLevel; i++) {
                    if (ideaData["level_cost_" + i]) {
                        costPerLevel.push(parseInt(ideaData["level_cost_" + i]));
                    } else if (i == 1) {
                        costPerLevel.push(0);
                    }
                }
                const modifierIdeaKey = Object.keys(ideaData).find(k => !k.startsWith("level_cost") && k != "max_level")!;
                const idea = new Idea(modifierIdeaKey, parseFloat(ideaData[modifierIdeaKey]), costPerLevel);
                this.addIdea(category, modifierIdeaKey, idea);
            }
        }
    }

    private addIdea(category: string, key: string, idea: Idea) {
        if (!this.ideas.has(category)) {
            this.ideas.set(category, new Map());
        }
        this.ideas.get(category)!.set(key, idea);
    }

    public getIdeaIconImageUrl(ideaKey: string) {
        return this.rootUrl + "gfx/ideas/" + ideaKey + ".webp";
    }

    public getCustomIdeas() {
        return this.ideas;
    }

    public waitForIdeas() {
        return new Promise((resolve, reject) => {
            if (this.ideas.size > 0) {
                resolve(null);
            } else {
                setTimeout(() => {
                    this.waitForIdeas().then(() => resolve(null));
                }, 100);
            }
        });
    }
}