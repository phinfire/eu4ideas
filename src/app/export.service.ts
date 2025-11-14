import { Injectable } from '@angular/core';
import { CanvasService } from './canvas.service';

export interface IPlotable {
    getPoints(): number;
    getNationName(): string;
    getPlayerName(): string;
    getNationImageUrl(): string;
    getPlayerImageUrl(): string;
}

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    //private fontFamily = "Titillium Web";
    //private fontFamily = "Eagle Lake";
    private fontFamily = "Permanent Marker";
    //private fontFamily = "Uncial Antiqua";

    //private fontFamily = "Caesar Dressing";
    //private fontFamily = "UnifrakturCook, cursive";

    private textColor = "rgb(220,220,220)"
    private backgroundColor = "rgb(30,30,30)";

    //private textColor = "rgb(220, 220, 157)";
    //private backgroundColor = "rgb(30, 30, 30)";

    //private textColor = "#3a3d40";
    //private backgroundColor = "#f4ecd8";

    constructor(private canvasService: CanvasService) {

    }

    private truncateString(str: string, maxLength: number): string {
        return str.substring(0, maxLength - 3) + (str.length > maxLength - 3 ? "..." : "");
    }

    public async exportAsImage<T extends IPlotable>(
        title: string,
        entries: T[],
        includePlayer: boolean
    ) {
        await document.fonts.ready;
        const fontSize = 30;
        const perRowHeight = 80;

        const flagScale = 0.8;
        const avatarScale = 0.7;
        const thick = 4;
        const thin = 1;

        const truncateStringTo = 21;
        const imageSize = perRowHeight * flagScale;
        const avatarSize = perRowHeight * avatarScale;

        // One sort is enough
        const pointSortedEntries = entries
            .slice()
            .sort((a, b) => {
                const byPoints = b.getPoints() - a.getPoints();
                if (byPoints !== 0) return byPoints;
                return a.getNationName().localeCompare(b.getNationName());
            });

        const bigFontSize = (5 * fontSize / 3);
        const headerPixelHeight = perRowHeight * 1.5;

        // Precompute offsets
        const offsets = [
            perRowHeight / 2,
            1.5 * perRowHeight,
            imageSize,
            2 * imageSize,
            avatarSize + 2 * perRowHeight - 0.5 * imageSize + 200,
            perRowHeight,
            avatarSize + 2 * perRowHeight - 0.5 * imageSize + 200
        ];
        const accumulatedOffsets = [];
        let total = 0;
        for (let v of offsets) {
            total += v;
            accumulatedOffsets.push(total);
        }

        // -------------------------------------------------------
        // 🔥 PRELOAD ALL IMAGES IN PARALLEL (flags + avatars)
        // -------------------------------------------------------

        const imageUrls = new Set<string>();
        for (const entry of pointSortedEntries) {
            imageUrls.add(entry.getNationImageUrl());
            if (includePlayer) {
                imageUrls.add(entry.getPlayerImageUrl());
            }
        }

        const cache = new Map<string, HTMLImageElement>();

        const preload = (url: string) => new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                cache.set(url, img);
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });

        await Promise.all([...imageUrls].map(preload));

        // -------------------------------------------------------
        // CANVAS SETUP
        // -------------------------------------------------------

        const canvas = document.createElement("canvas");
        canvas.height = headerPixelHeight + perRowHeight * pointSortedEntries.length;
        canvas.width = total;
        const ctx = canvas.getContext("2d")!;

        // background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // border
        ctx.strokeStyle = this.textColor;
        ctx.lineWidth = thick;
        ctx.strokeRect(thick / 2, thick / 2, canvas.width - thick, canvas.height - thick);

        // title
        ctx.fillStyle = this.textColor;
        ctx.font = `bold ${bigFontSize}px ${this.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(title, canvas.width / 2, 0.6 * headerPixelHeight);

        // row separator lines
        for (let i = 0; i < pointSortedEntries.length; i++) {
            ctx.lineWidth = (i > 0 && pointSortedEntries[i].getPoints() === pointSortedEntries[i - 1].getPoints())
                ? thin
                : thick;

            ctx.beginPath();
            ctx.moveTo(0, headerPixelHeight + i * perRowHeight);
            ctx.lineTo(canvas.width, headerPixelHeight + i * perRowHeight);
            ctx.stroke();
        }

        // separator between index and rows
        ctx.lineWidth = thin;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(perRowHeight, headerPixelHeight);
        ctx.lineTo(perRowHeight, headerPixelHeight + perRowHeight * pointSortedEntries.length);
        ctx.stroke();
        ctx.globalAlpha = 1;

        for (let i = 0; i < pointSortedEntries.length; i++) {
            const entry = pointSortedEntries[i];
            const yCenter = headerPixelHeight + i * perRowHeight + perRowHeight / 2;

            // index (rank)
            ctx.font = `${fontSize}px ${this.fontFamily}`;
            ctx.textAlign = "center";
            ctx.globalAlpha = 0.5;
            ctx.fillText(String(i + 1), accumulatedOffsets[0], yCenter);
            ctx.globalAlpha = 1;

            // points
            ctx.font = `bold ${bigFontSize}px ${this.fontFamily}`;
            ctx.textAlign = "right";
            if (i === 0 || entry.getPoints() !== pointSortedEntries[i - 1].getPoints()) {
                ctx.fillText(String(entry.getPoints()), accumulatedOffsets[1], yCenter);
            }

            // flag image
            {
                const img = cache.get(entry.getNationImageUrl())!;
                const y = headerPixelHeight + ((1 - flagScale) / 2 + i) * perRowHeight;
                ctx.drawImage(img, accumulatedOffsets[2], y, imageSize, imageSize);
            }

            // nation name
            ctx.font = `${fontSize}px ${this.fontFamily}`;
            ctx.textAlign = "left";
            const nationName = this.truncateString(entry.getNationName(), truncateStringTo);
            ctx.fillText(nationName, accumulatedOffsets[3], yCenter);

            if (includePlayer) {
                const img = cache.get(entry.getPlayerImageUrl())!;
                const y = headerPixelHeight + ((1 - avatarScale) / 2 + i) * perRowHeight;
                ctx.drawImage(img, accumulatedOffsets[4], y, avatarSize, avatarSize);

                const playerName = this.truncateString(entry.getPlayerName(), truncateStringTo);
                ctx.fillText(playerName, accumulatedOffsets[5], yCenter);
            }
        }

        canvas.style.height = "calc(100vh - 100px)";
        canvas.style.width = "auto";

        return canvas;
    }
}
