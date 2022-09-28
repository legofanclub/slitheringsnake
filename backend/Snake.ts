import { Segment } from '../sharedFrontBack/sharedTypes.js';
import { STARTING_SNAKE_RADIUS, WORLD_SIZE } from '../sharedFrontBack/WorldVariables.js';
import { WorldGrid } from './WorldGrid.js';

/**
 * This class represents a single Slither snake and has functionality for it to move, turn, grow, shrink, and boost.
 * The class is also responsible for keeping the snake within the bounds of the map.
 */
export class Snake {
  color: string;
  direction: number;
  segments: Segment[];
  radius: number;
  pressed: boolean;
  MAX_TURN_PER_TICK: number;
  LINK_DISTANCE: number;
  inputAngle: number;
  head: Segment;
  speed: number;
  BOOSTING_SPEED: number;
  boosting: boolean;
  boostCounter: number;
  BOOST_DURATION: number;
  name: string;
  worldGrid: WorldGrid;
  constructor(name: string, worldGrid: WorldGrid) {
    this.name = name;
    this.color = "white";
    this.direction = 0;
    this.segments = [];
    this.radius = STARTING_SNAKE_RADIUS;
    this.worldGrid = worldGrid;


    // 3 physics type snake parameters
    this.speed = 3; // also changes tightest possible turn
    this.MAX_TURN_PER_TICK = Math.PI / 30;
    this.LINK_DISTANCE = 5;

    this.inputAngle = 0;

    this.initializeStartingSnake();
    this.head= this.segments[0];

    // boosting properties
    this.pressed = false; // if mouse is pressed
    this.BOOSTING_SPEED = 1.5;
    this.boosting = false; // if boost activated (can only boost if length > 3)
    this.boostCounter = 0;
    this.BOOST_DURATION = 5;
  }

  initializeStartingSnake(){
    for (let i = 0; i < 3; i++) {
      this.segments.push(new Segment(100, 100, this.radius, i, this.name));
    }
    this.setCorrectRadiusAndSpeedAndMaxTurnAndLimitSize();
  }

  /**
   * This method adds a new segment, slows the snake, and increases the snake's size.
   */
  grow(){
    // add a new segment ontop of the (previously) last segment
    let tailSegment = this.segments[this.segments.length-1];
    this.segments.push(new Segment(tailSegment.x, tailSegment.y, this.radius, this.segments.length, this.name));
    this.setCorrectRadiusAndSpeedAndMaxTurnAndLimitSize();
  }

  setInputAngle(a: number){
    this.inputAngle = a;
  }

  /**
   * Updates snake's state by one tick.
   */
  update() {
    let originalHeadPosition = Object.assign({}, this.head);
    this.setBoosting();
    this.moveHead();
    this.moveRestOfBody(originalHeadPosition);
  }

  setBoosting() {
    if(this.pressed && this.segments.length > 3){
      this.boosting = true;
      this.boostCounter += 1;
      this.color = "pink";
    } else{
      this.boosting = false;
      this.color = "white";
    }

    // pop off segments when boost used
    if(this.boostCounter >= this.BOOST_DURATION){
      this.boostCounter = 0;
      let segment = this.segments.pop();
      if(segment){
        // also remove segment in worldGrid
        this.worldGrid.removeSegmentFromGrid(segment);
      }
      this.setCorrectRadiusAndSpeedAndMaxTurnAndLimitSize();
    }

  }

  setCorrectRadiusAndSpeedAndMaxTurnAndLimitSize(){
    let logLength = Math.log(this.segments.length)
    this.radius = logLength*10 + 5;
    this.speed = 6-Math.min(logLength, 4);
    this.MAX_TURN_PER_TICK = Math.max(Math.PI / 30 - Math.PI/360*logLength**2, Math.PI/180);

    if(this.segments.length > 200){
      this.segments.pop();
    }
  }

  moveHead() {
    let angle = this.inputAngle;

    if (Math.abs(angle) > this.MAX_TURN_PER_TICK) {
      let c = Math.abs(angle / this.MAX_TURN_PER_TICK);
      angle /= c;
    }

    this.direction += angle;

    // maintain this.direction between [0, 2*PI)
    this.direction %= (2*Math.PI);
    this.direction = (this.direction + 2*Math.PI)%(2*Math.PI);
    
    this.head.x += (this.boosting? this.BOOSTING_SPEED: 1)* this.speed * Math.cos(this.direction);
    this.head.y -= (this.boosting? this.BOOSTING_SPEED: 1)* this.speed * Math.sin(this.direction);
    
    this.snapAngleIfOnWall();
    this.checkAndRectifyOutOfBounds();
  }

  checkAndRectifyOutOfBounds(){
    if(this.head.x < 0){
      this.head.x = 0;
    } else if(this.head.x > WORLD_SIZE - 1){
      this.head.x = WORLD_SIZE - 1;
    }
    if(this.head.y < 0){
      this.head.y = 0;
    } else if(this.head.y > WORLD_SIZE - 1){
      this.head.y = WORLD_SIZE - 1;
    }
  }

  /**
   * Snaps snake direction to closest reasonable direction if snake head is in a wall or corner.
   */
  snapAngleIfOnWall(){
    // 8 cases (4 walls and 4 corners)
    // each case has a pair of directions it can snap to

    // top left corner
    if(this.head.x < 0 && this.head.y < 0){
      this.direction = this.closestAngleToDirection(0, 3*Math.PI/2);
    }
    // bottom right corner
    else if(this.head.x > WORLD_SIZE - 1 && this.head.y > WORLD_SIZE - 1){
      this.direction = this.closestAngleToDirection(Math.PI/2, Math.PI);
    }
    // top right corner
    else if(this.head.x > WORLD_SIZE - 1 && this.head.y < 0){
      this.direction = this.closestAngleToDirection(Math.PI, 3*Math.PI/2);
    }
    // bottom left corner
    else if(this.head.x < 0 && this.head.y > WORLD_SIZE - 1){
      this.direction = this.closestAngleToDirection(Math.PI/2, 0);
    }
    //left wall
    else if(this.head.x < 0){
      this.direction = this.closestAngleToDirection(Math.PI/2, 3*Math.PI/2);
    }
    //right wall
    else if(this.head.x > WORLD_SIZE - 1){
      this.direction = this.closestAngleToDirection(Math.PI/2, 3*Math.PI/2);
    }
    //top wall
    else if(this.head.y < 0){
      this.direction = this.closestAngleToDirection(0, Math.PI);
    }
    //bottom wall
    else if(this.head.y > WORLD_SIZE - 1){
      this.direction = this.closestAngleToDirection(0, Math.PI);
    }
  }

  /**
   * @param option1 (an angle)
   * @param option2 (an angle)
   * @returns closest angle to snake's direction, if equal returns second direction given
   */
  closestAngleToDirection(option1: number, option2: number){
    let diff1 = Math.abs(Math.atan2(Math.sin(option1-this.direction), Math.cos(option1-this.direction)))
    let diff2 = Math.abs(Math.atan2(Math.sin(option2-this.direction), Math.cos(option2-this.direction)))

    if(diff1 <= diff2){
      return(option1);
    } else{
      return(option2);
    }
  }

  moveRestOfBody(originalHeadPosition: Segment) {
    let lastSegmentPosition = {x: originalHeadPosition.x, y: originalHeadPosition.y};
    for (let i = 1; i < this.segments.length; i++) {
      let copyOfCurrent = {x: this.segments[i].x, y: this.segments[i].y};

      // move this segment along the vector from this segment to preceeding segment
      let differenceVector = {
        x: lastSegmentPosition.x - copyOfCurrent.x,
        y: lastSegmentPosition.y - copyOfCurrent.y,
      };

      this.segments[i].x += (this.boosting? this.BOOSTING_SPEED: 1)*differenceVector.x / this.LINK_DISTANCE;
      this.segments[i].y += (this.boosting? this.BOOSTING_SPEED: 1)*differenceVector.y / this.LINK_DISTANCE;
      lastSegmentPosition = copyOfCurrent;
    }
  }

  setPressed(mousePressed: boolean) {
    this.pressed = mousePressed;
  }
}
