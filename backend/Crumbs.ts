import { Crumb } from "../sharedFrontBack/sharedTypes.js";
import { WORLD_SIZE, NUMBER_OF_CRUMBS } from "../sharedFrontBack/WorldVariables.js";

/**
 * A class representing the world state for all the crumbs (food).
 */
export class Crumbs {
    crumbs: Crumb[];
    totalCrumbsOnMap: number;
    constructor() {
        this.crumbs = []
        this.totalCrumbsOnMap = 0;
        for(let i = 0; i < NUMBER_OF_CRUMBS; i++){
            this.addCrumb(i);
        }
    }

    /** Adds a crumb to the world with random coordinates */
    addCrumb(name){
        this.crumbs.push(new Crumb(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE,this.totalCrumbsOnMap));
        this.totalCrumbsOnMap += 1;
    }

    /**
     * Moves a random crumb to these coordinates
     * @param x new x-coord of crumb
     * @param y new y-coord of crumb
     */
    moveCrumb(x: number, y: number) {
        if(x === 100 && y === 100){ // this makes sure that spawn killed snakes don't create a pile of crumbs on top of eachother
            x = Math.random()*WORLD_SIZE;
            y = Math.random()*WORLD_SIZE;
        }
        let crumbToMove = this.crumbs[Math.floor(Math.random()*this.crumbs.length)];
        crumbToMove.x = x;
        crumbToMove.y = y;
    }

    repositionCrumb(crumb){
        crumb.x = Math.random()*WORLD_SIZE;
        crumb.y = Math.random()*WORLD_SIZE;
    }
  }