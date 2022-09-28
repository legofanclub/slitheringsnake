import { TILE_SIZE } from "../sharedFrontBack/WorldVariables.js";
import { WORLD_SIZE } from "../sharedFrontBack/WorldVariables.js";
import { Snake } from "./Snake.js";
import { Crumb, Entity, Segment, SimpleTileData, SimpleCrumb, SimplePosition, SimpleSegment } from "../sharedFrontBack/sharedTypes.js";

export class WorldGrid{
    grid: Tile[][];
    snakes: Snake[];
    crumbs: Crumb[];
    sideLength: number;
    constructor(snakes: Snake[], crumbs: Crumb[]){
        this.grid = [];
        this.snakes = snakes;
        this.crumbs = crumbs;
        this.initializeGrid();
        this.sideLength = WORLD_SIZE/TILE_SIZE;
    }

    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < WORLD_SIZE / TILE_SIZE; y++) {
            let row: Tile[] = [];
            for (let x = 0; x < WORLD_SIZE / TILE_SIZE; x++) {
                row.push(new Tile(x, y));
            }
            this.grid.push(row);
        }

        for (let crumb of this.crumbs) {
            this.addCrumbToGrid(crumb);
        }
    }    

    /**
     * checks all entities and if they've changed grid position, deletes them from grid and re-ads them into the correct position
     */
    update(){
        for(let crumb of this.crumbs){
            if(this.hasMoved(crumb)){
                this.removeCrumbFromGrid(crumb);
                this.addCrumbToGrid(crumb);
            }
        }

        for(let snake of this.snakes){
            for(let segment of snake.segments){
                if(this.hasMoved(segment)){
                    this.removeSegmentFromGrid(segment);
                    this.addSegmentToGrid(segment);

                }
            }
        }
    }

    /**
     * Adds snake to grid.
     * @param snake snake to add
     */
    addSnake(snake: Snake) {
        for (let segment of snake.segments) {
            this.addSegmentToGrid(segment);
        }
    }

    /**
     * Removes snake from grid. Performance: O(#of segments in snake).
     * @param snake snake to remove
     */
    removeSnake(snake: Snake) {
        for(let segment of snake.segments){
            let locations = segment.previousLocations;
            for(let location of locations){
                if(this.grid[location.y][location.x].segments[segment.owner]){
                    delete this.grid[location.y][location.x].segments[segment.owner];
                }
            }
        }
    }

    /**
     * Compares entity's previous locations with locations it would be put in it it were re-added to grid, returns true if they are different.
     * @param entity entity to check
     * @returns if entity has moved
     */
    hasMoved(entity: Entity): Boolean{
        let oldLocations = entity.previousLocations;
        let newLocations = this.getGridLocationsToAdd(entity);
        return(!((newLocations.length == oldLocations.length) && oldLocations.every((val, i) => {return(val.x === newLocations[i].x && val.y === newLocations[i].y)})));
    }

    /**
     * Returns data from nearest 9 tiles to snake head (less if they would be off the map).
     * @param snake snake to return nearby info for
     * @returns object with data from nearby crumbs, snake segments, and the tile positions that the data was from
     */
    getNearbyData(snake: Snake): SimpleTileData{
        let closestTiles = this.getNearbyTiles(snake);
        let crumbsAllData: Crumb[] = closestTiles.map((tile)=>tile.crumbs).flat().map((obj)=>{return(Object.values(obj))}).flat(); // expensive line
        let crumbsImportantData: SimpleCrumb[] = crumbsAllData.map((crumb)=>{return({x: crumb.x, y: crumb.y})});

        let segmentsImportantData = getSimpleSegmentMap(closestTiles);

        let tilePositions: SimplePosition[] = closestTiles.map((tile)=>tile.position);

        return({crumbs: crumbsImportantData, segments: segmentsImportantData, tilePositions: tilePositions});
    }
    
    /**
     * @param snake snake to return nearby info for
     * @returns Returns 9 nearest tiles to @param snake head, less if they would be out of the map.
     */
    getNearbyTiles(snake: Snake): Tile[]{
        let gridX = Math.floor(snake.head.x/TILE_SIZE);
        let gridY = Math.floor(snake.head.y/TILE_SIZE);
        return([this.grid[gridY][gridX],
                ... (gridX+1 < this.sideLength)                              ? [this.grid[gridY][gridX+1]]   : [],
                ... (gridX-1 >= 0)                                           ? [this.grid[gridY][gridX-1]]   : [],
                ... (gridY+1 < this.sideLength)                              ? [this.grid[gridY+1][gridX]]   : [],
                ... (gridY-1 >= 0)                                           ? [this.grid[gridY-1][gridX]]   : [],
                ... (gridY+1 < this.sideLength && gridX+1 < this.sideLength) ? [this.grid[gridY+1][gridX+1]] : [],
                ... (gridY-1 >= 0              && gridX+1 < this.sideLength) ? [this.grid[gridY-1][gridX+1]] : [],
                ... (gridY+1 < this.sideLength && gridX-1 >= 0)              ? [this.grid[gridY+1][gridX-1]] : [],
                ... (gridY-1 >= 0              && gridX-1 >= 0)              ? [this.grid[gridY-1][gridX-1]] : []
            ]);
    }
    
    /**
     * Adds crumb to grid and sets the crumb's location. Crumb may be added in multiple locations.
     * @param crumb crumb to add
     */
    addCrumbToGrid(crumb: Crumb) {
        let locations = this.getGridLocationsToAdd(crumb);
        for (let location of locations) {
            this.grid[location.y][location.x].crumbs[crumb.name] = crumb;
        }
        crumb.previousLocations = this.getGridLocationsToAdd(crumb);
    }

    /**
     * Removes crumb from all its locations in grid.
     * @param crumb crumb to remove
     */
    removeCrumbFromGrid(crumb: Crumb){
        let oldLocations = crumb.previousLocations;
        for(let location of oldLocations){
            delete this.grid[location.y][location.x].crumbs[crumb.name];
        }
    }

    /**
     * Adds segment to grid and sets the segment's location. Segment may be added in multiple locations.
     * @param segment segment to add
     */
    addSegmentToGrid(segment: Segment) {
        let locations = this.getGridLocationsToAdd(segment);
        for(let location of locations){
            this.grid[location.y][location.x].segments[segment.owner] ??= {};
            this.grid[location.y][location.x].segments[segment.owner][segment.index] = segment;
        }
        segment.previousLocations = this.getGridLocationsToAdd(segment);
    }

    /**
     * Removes segment from all its locations in grid.
     * @param segment segment to remove
     */
    removeSegmentFromGrid(segment: Segment) {
        let oldLocations = segment.previousLocations;
        for (let location of oldLocations) {
            delete this.grid[location.y][location.x].segments[segment.owner][segment.index];
            if (Object.keys(this.grid[location.y][location.x].segments[segment.owner]).length == 0) {
                delete this.grid[location.y][location.x].segments[segment.owner];
            }
        }
    }

    /**
     * @param entity Entity to put into grid
     * @returns list of positions where entity should be added to grid (all grid squares that entity overlaps)
     */
    getGridLocationsToAdd(entity: Entity): {x:number,y:number}[]{
        let x = Math.floor(entity.x/TILE_SIZE);
        let y = Math.floor(entity.y/TILE_SIZE);
        let xRemainder = entity.x%TILE_SIZE;
        let yRemainder = entity.y%TILE_SIZE;
        
        let toAdd: {x:number,y:number}[] = [];
        toAdd.push({x: x, y: y}) // add entity to basic tile

        // now check if entity is also in other tiles and add it to those tiles
        if(xRemainder < entity.radius && x > 0){
            toAdd.push({y: y, x: x-1});
        }
        if(yRemainder < entity.radius && y > 0){
            toAdd.push({y: y-1, x: x});
        }
        if((TILE_SIZE-xRemainder) < entity.radius && x + 1 < this.grid[0].length){
            toAdd.push({y: y, x: x+1});
        }
        if((TILE_SIZE-yRemainder) < entity.radius && y + 1 < this.grid.length){
            toAdd.push({y: y+1, x: x});
        }

        // add entity to diagonals if needed
        //northeast
        if((xRemainder < entity.radius)&&(yRemainder < entity.radius) && x > 0 && y > 0){
            toAdd.push({y: y-1, x: x-1});
        }
        //southwest
        if(((TILE_SIZE-xRemainder) < entity.radius)&&((TILE_SIZE-yRemainder) < entity.radius)&& x + 1 < this.grid[0].length&& y + 1 < this.grid.length){
            toAdd.push({y: y+1, x: x+1});
        }
        //southeast
        if((xRemainder < entity.radius)&&((TILE_SIZE-yRemainder) < entity.radius)&& y + 1 < this.grid.length && x > 0){
            toAdd.push({y: y+1, x: x-1});
        }
        //northwest
        if((yRemainder < entity.radius)&&((TILE_SIZE-xRemainder) < entity.radius)&& y > 0 && x + 1 < this.grid[0].length){
            toAdd.push({y: y-1, x: x+1});
        }

        return(toAdd);
    }
}

export class Tile{
    segments: {[name: string] : {[index: number]: Segment}};
    crumbs: {[id: number] : Crumb};
    position: {x: number, y: number}
    constructor(x: number, y: number){
        this.segments = {};
        this.crumbs = {};
        this.position = {x: x, y: y};
    }
}

/**
 * @param tiles tiles to get segments from
 * @returns a map from snake names to an unordered list of snake segments
 */
function getSimpleSegmentMap(tiles: Tile[]): {[name: string] : SimpleSegment[]} {
    let segmentsAllData = tiles.map((tile)=>tile.segments).flat();
    let segmentsImportantData: {[name: string] : SimpleSegment[]} = {};
    for(let simplerTile of segmentsAllData){
        for(let [name, segments] of Object.entries(simplerTile)){
            segmentsImportantData[name] ??= [];
            for(let [index, segment] of Object.entries(segments)){
                segmentsImportantData[name].push({x: segment.x, y: segment.y, index: segment.index});
            }
        }
    }
    return(segmentsImportantData);
}
