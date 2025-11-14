import * as d3 from 'd3';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { IdeaAtLevel } from '../types/IdeaAtLevel';
import { EU4Service } from '../types/game/EU4Service';
import { IIdea } from '../types/game/IIdea';
import { Mana } from '../types/game/Mana';
import { UserConfigurationProvider } from '../types/UserConfigurationProvider';
  
const scrollyCantGoLowerThan = 1;

@Component({
  selector: 'app-graphview',
  imports: [],
  templateUrl: './graphview.component.html',
  styleUrl: './graphview.component.scss'
})
export class GraphviewComponent {

  @ViewChild('svgElement', { static: true }) svgElement!: ElementRef<SVGElement>;

  svgWidth = 1800;
  svgHeight = 1000;

  constructor(private elementRef: ElementRef, private iconSupplier: EU4Service) {
    
  }


  ngOnInit() {

  }

  showIdeaHistogram(results: Map<string,{ideas: IdeaAtLevel[], loc: Map<string,string>}>) {
    const values = new Map<string, number>();
    const key2IdeamUrlMap = new Map<string, IIdea>();
    for (let [tag, { ideas, loc }] of results) {
      for (let idea of ideas) {
        if (!values.has(idea.getIdea().getKey())) {
          values.set(idea.getIdea().getKey(), 0);
        }
        //values.set(idea.getIdea().getKey(), values.get(idea.getIdea().getKey())! + 1);
        values.set(idea.getIdea().getKey(), values.get(idea.getIdea().getKey())! + idea.getIdea().getCostAtLevel(idea.getLevel()));
        //values.set(idea.getIdea().getKey(), values.get(idea.getIdea().getKey())! + idea.getLevel());
        key2IdeamUrlMap.set(idea.getIdea().getKey(), idea.getIdea());
      }
    }
    const sortedValues = new Map(
      Array.from(values.entries()).filter(([key, value]) => value > 0).sort((a, b) => b[1] - a[1])
    );
    this.draw(sortedValues, (key: string) => {
      return this.iconSupplier.getIdeaIconImageUrl(key2IdeamUrlMap.get(key)!.getKey());
    }, (key: string) => {
      const mana = key2IdeamUrlMap.get(key)!.getMana();
      if (mana == Mana.ADM) {
        return "rgb(244, 224, 199)";
      } else if (mana == Mana.DIP) {
        return "rgb(0, 128, 255)";
      } else if (mana == Mana.MIL) {
        return "rgb(128, 0, 0)";
      }
      throw new Error("Mana not implemented: " + mana);
    });
  }

  private draw(values: Map<string, number>, key2ImageUrl: (key: string) => string, key2color: (key: string) => string) {
    
  
    const containerWidth = 0.95 * (this.elementRef.nativeElement.clientWidth || window.innerWidth);
    const containerHeight = 0.85 * (this.elementRef.nativeElement.clientHeight || window.innerHeight);
  
    const margin = { top: 20, right: 30, bottom: 140, left: 40 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
  
    const data = Array.from(values.values());
    const svg = d3.select(this.svgElement.nativeElement)
      .style("opacity", 0.8)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand()
      .domain(Array.from(values.keys()))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data) || 0])
      .nice()
      .range([height, 0]);

    svg.append('g')
      .selectAll('rect')
      .data(Array.from(values.entries()))
      .enter()
      .append('rect')
      .attr('x', d => x(d[0])!)
      .attr('y', d => y(d[1]))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d[1]))
      .attr('fill', d => key2color(d[0]))
      /*.attr('stroke', "var(--font-color)")
      .attr('stroke-width', 1);*/

    svg.append('g')
      .selectAll('image')
      .data(Array.from(values.keys()))
      .enter()
      .append('image')
      .attr('x', d => x(d)!)
      .attr('y', height + x.bandwidth() / 4)
      .attr('width', x.bandwidth())
      .attr('height', x.bandwidth())
      .attr('xlink:href', d => key2ImageUrl(d));



    svg.append('g')
      .call(d3.axisLeft(y));
  }
  
}