declare module "react-plotly.js" {
  import { Component } from "react";
  import { Data, Layout, Config, Template } from "plotly.js-dist-min";

  interface PlotParams {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    frames?: Frame[];
    revision?: number;
    onInitialized?: (figure: Figure, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: Figure, graphDiv: HTMLElement) => void;
    onPurge?: (figure: Figure, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    onClick?: (event: PlotMouseEvent) => void;
    onHover?: (event: PlotMouseEvent) => void;
    onUnHover?: (event: PlotMouseEvent) => void;
    onSelected?: (event: PlotSelectionEvent) => void;
    onDeselect?: () => void;
    onDoubleClick?: () => void;
    onRelayout?: (event: PlotRelayoutEvent) => void;
    onRestyle?: (event: PlotRestyleEvent) => void;
    onRedraw?: () => void;
    onClickAnnotation?: (event: PlotClickAnnotationEvent) => void;
    onAfterPlot?: () => void;
    onAnimated?: () => void;
    onAnimatingFrame?: (event: { frame: { name: string } }) => void;
    onTransitioning?: () => void;
    onTransitionInterrupted?: () => void;
    divId?: string;
    className?: string;
    style?: React.CSSProperties;
    debug?: boolean;
    useResizeHandler?: boolean;
    url?: string;
  }

  interface Figure {
    data: Data[];
    layout: Partial<Layout>;
    frames: Frame[] | null;
  }

  interface Frame {
    name?: string;
    data?: Data[];
    group?: string;
    traces?: number[];
    baseframe?: string;
    layout?: Partial<Layout>;
  }

  interface PlotMouseEvent {
    points: PlotPoint[];
    event: MouseEvent;
  }

  interface PlotPoint {
    x: number;
    y: number;
    z?: number;
    lat?: number;
    lon?: number;
    curveNumber: number;
    pointNumber: number;
    pointIndex: number;
    data: Data;
    customdata: unknown;
  }

  interface PlotSelectionEvent {
    points: PlotPoint[];
    range?: { x: [number, number]; y: [number, number] };
    lassoPoints?: { x: number[][]; y: number[][] };
  }

  interface PlotRelayoutEvent {
    [key: string]: unknown;
  }

  interface PlotRestyleEvent {
    [key: string]: unknown;
  }

  interface PlotClickAnnotationEvent {
    index: number;
    annotation: { [key: string]: unknown };
    fullAnnotation: { [key: string]: unknown };
    event: MouseEvent;
  }

  export default class Plot extends Component<PlotParams> {}
}
