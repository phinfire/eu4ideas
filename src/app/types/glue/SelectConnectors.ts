import { ISelectConnector } from "./ISelectConnectors";

export class SelectConnector implements ISelectConnector {

    private selection: Set<string> = new Set<string>();
    private listeners: (() => void)[] = [];

    constructor(private maxNumSelecteded: number) {
        
    }
 
    registerSelectionChangedListener(listener: () => void): void {
        this.listeners.push(listener);
    }
    getSelectedKeys(): Set<string> {
        return this.selection;
    }
    isSelected(key: string): boolean {
        return this.selection.has(key);
    }
    setSelection(keys: string[]): void {
        if (keys.length > this.maxNumSelecteded) {
            throw new Error("Too many keys selected");
        }
        this.selection = new Set<string>(keys);
        this.listeners.forEach(listener => listener());
    }
    setSelected(key: string, selected: boolean): void {
        if (selected) {
            if (this.selection.size >= this.maxNumSelecteded) {
                throw new Error("Too many keys selected");
            }
            this.selection.add(key);
        } else {
            this.selection.delete(key);
        }
        this.listeners.forEach(listener => listener());
    }
    canAlterSelection(key: string): boolean {
        return this.selection.size < this.maxNumSelecteded || this.selection.has(key);
    }

}