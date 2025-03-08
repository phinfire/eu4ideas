import { Component } from '@angular/core';
import { EU4Service } from '../types/EU4Service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatTreeModule } from '@angular/material/tree';
import { CommonModule } from '@angular/common';
import { Idea } from '../types/Idea';
import { IdeasConnector } from '../types/IdeasConnector';

interface TreeNode {
  idea?: Idea;
  key: string;
  children?: TreeNode[];
}

@Component({
  selector: 'app-idea-modifier-tree',
  imports: [CommonModule, MatTreeModule, MatIconModule, MatTooltipModule],
  templateUrl: './idea-modifier-tree.component.html',
  styleUrl: './idea-modifier-tree.component.scss'
})
export class IdeaModifierTreeComponent {

  treeData: TreeNode[] = [];

  constructor(private eu4: EU4Service, private connector: IdeasConnector) {

  }
  
  ngOnInit() {
    this.eu4.waitUntilReady().then(() => {
      const treeData: TreeNode[] = [];
      for (let [manaType, ideas] of this.eu4.getCustomIdeas().entries()) {
        const children: TreeNode[] = [];
        for (let [ideaKey, idea] of ideas.entries()) {
          children.push({key: ideaKey, idea: idea});
        }
        treeData.push({key: manaType, children: children.sort((a, b) => this.eu4.localizeIdea(a.key).localeCompare(this.eu4.localizeIdea(b.key)))});
      }
      this.treeData = treeData;
    });
  }

  getNodeLabel(node: TreeNode) {
    return this.eu4.localizeIdea(node.key);
  }

  getImageUrl(node: TreeNode) {
    return this.eu4.getIdeaIconImageUrl(node.key);
  }

  onLeafNodeClick(node: TreeNode): void {
    if (node.idea) {
      this.connector.toggleSelection(node.idea);
    }
  }

  leafIsSelected(node: TreeNode): boolean {
    return this.connector.getSelectedIdeas().some(idea => idea.getKey() === node.key);
  }

  childrenAccessor = (node: TreeNode) => node.children ?? [];

  hasChild = (_: number, node: TreeNode) => !!node.children && node.children.length > 0;
}
