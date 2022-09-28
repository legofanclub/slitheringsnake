import { CRUMB_RADIUS } from "./WorldVariables.js";

export type clientToServerMessage = {
    angle: number;
    mousePressed: boolean;
}

export type SimpleTileData = {
    crumbs: SimpleCrumb[],
    segments: { [name: string]: SimpleSegment[] },
    tilePositions: SimplePosition[];
}

export type serverToClientMessage = {
    crumbs: SimpleCrumb[],
    segments: { [name: string]: SimpleSegment[] },
    tilePositions: SimplePosition[];
    snakeFacts: SnakeFact[];
    yourDirection: number;
    yourHead: { x: number, y: number };
}

/**
 * Never instantiated, only used as an interface for Segment and Crumb.
 */
export class Entity {
    x: number;
    y: number;
    radius: number;
    previousLocations: { x: number; y: number; }[];
    constructor(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.previousLocations = [];
    }
}

/**
 * A single segment of a snake.
 */
export class Segment extends Entity {
    index: number;
    owner: string;
    constructor(x: number, y: number, radius: number, index: number, owner: string) {
        super(x, y, radius);
        this.index = index;
        this.owner = owner;
    }
}

/**
 * A food particle.
 */
export class Crumb extends Entity {
    name: number;
    constructor(x: number, y: number, name: number) {
        super(x, y, CRUMB_RADIUS);
        this.name = name;
    }
}

export type SimpleCrumb = { x: number, y: number }
export type SimpleSegment = { x: number, y: number, index: number }
export type SimplePosition = { x: number, y: number }
export type SnakeFact = { radius: number, color: string }