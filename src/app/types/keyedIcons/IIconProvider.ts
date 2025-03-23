import { KeyedIcon } from "./KeyedIcon";

export interface IIconProvider {
    getIcons(): Promise<KeyedIcon[]>;
}