import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class CanvasService {

    constructor() { }

    public async drawImage(
        ctx: CanvasRenderingContext2D,
        url: string,
        x: number,
        y: number,
        imageSize: number,
        clipPolygon: { x: number, y: number }[],
        outline: boolean
    ): Promise<void> {
        try {
            const img = await this.loadImage(url);
            this.drawClippedImage(ctx, img, x, y, imageSize, clipPolygon);

            if (outline) {
                this.drawOutline(ctx, clipPolygon, x, y, imageSize);
            }
        } catch (error) {
            console.error(`Error loading or drawing the image from URL "${url}":`, error);
        }
    }

    private drawClippedImage(
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        x: number,
        y: number,
        imageSize: number,
        clipPolygon: { x: number, y: number }[]
    ): void {
        ctx.save();
        ctx.beginPath();
        const polyPath = this.calculatePolygonPath(clipPolygon, x, y, imageSize);
        this.createPolygonPath(ctx, polyPath);
        ctx.clip();
        ctx.drawImage(img, x, y, imageSize, imageSize);
        ctx.restore();
    }

    private drawOutline(
        ctx: CanvasRenderingContext2D,
        clipPolygon: { x: number, y: number }[],
        x: number,
        y: number,
        imageSize: number
    ): void {
        const polyPath = this.calculatePolygonPath(clipPolygon, x, y, imageSize);
        ctx.lineWidth = 1;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'black';
        ctx.beginPath();
        this.createPolygonPath(ctx, polyPath);
        ctx.closePath();
        ctx.stroke();
    }

    private calculatePolygonPath(
        clipPolygon: { x: number, y: number }[],
        x: number,
        y: number,
        imageSize: number
    ): [number, number][] {
        return clipPolygon.map(p => [x + p.x * imageSize / 100, y + p.y * imageSize / 100]);
    }

    private createPolygonPath(ctx: CanvasRenderingContext2D, polyPath: [number, number][]): void {
        ctx.moveTo(polyPath[0][0], polyPath[0][1]);
        for (let i = 1; i < polyPath.length; i++) {
            ctx.lineTo(polyPath[i][0], polyPath[i][1]);
        }
    }

    public loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = src + "?t=" + new Date().getTime();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image from URL: ${src}`));
        });
    }

    public setupCoatOfArmsPolygonClipPath(flag: HTMLImageElement) {
        flag.style.clipPath = this.getCoatOfArmsPolygonClipPathString();
        flag.addEventListener("dragstart", (event) => {
            event.preventDefault();
        });
    }
    
    public getCoatOfArmsPolygonClipPathString() {
        return "polygon(" + this.getCoatOfArmsPolygonClipPath().map(p => p.x + "% " + p.y + "%").join(",") + ")";
    }

    public getCircularPolygonClipPath() {
        const center = {x: 50, y: 50};
        const radius = 50;
        const steps = 20;
        const clipPolyPoints = [];
        for (let i = 0; i < steps; i++) {
            const x = center.x + Math.cos(i / steps * 2 * Math.PI) * radius;
            const y = center.y + Math.sin(i / steps * 2 * Math.PI) * radius;
            clipPolyPoints.push({x: x, y: y});
        }
        return clipPolyPoints;
    }

    public getCoatOfArmsPolygonClipPath() {
        const startCurve = 40;
        const halfCurveSteps = 10;
        const clipPolyPoints = [];
        const halfWidth = 50; 
        clipPolyPoints.push({x: 0, y: 0});
        clipPolyPoints.push({x: 100, y: 0});
        clipPolyPoints.push({x: 100, y: startCurve});
        const circleCenter = {x: 50, y: startCurve};
        const scaleyTestRatio = (100-startCurve) / halfWidth;
        const circleRadius = halfWidth;
        for (let i = 1; i <= halfCurveSteps; i++) {
            const y = circleCenter.y + scaleyTestRatio * Math.sin(i / halfCurveSteps * Math.PI / 2) * circleRadius;
            const x = circleCenter.x + Math.cos(i / halfCurveSteps * Math.PI / 2) * circleRadius;
            clipPolyPoints.push({x: x, y: y});
        }
        const length = clipPolyPoints.length;
        for (let i = length -1 ; i > 1; i--) {
            const partner: { x: number, y: number } = clipPolyPoints[i];
            clipPolyPoints.push({x: (100-partner.x), y: partner.y});
        }
        return clipPolyPoints;
    }
}