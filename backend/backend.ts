import geckos, { Data } from '@geckos.io/server'
import { Snake } from "./Snake.js";
import { Crumbs } from "./Crumbs.js";
import { CRUMBS_ON_DEATH, CRUMB_RADIUS } from "../sharedFrontBack/WorldVariables.js";
import { WorldGrid } from './WorldGrid.js';
import { clientToServerMessage, SnakeFact } from '../sharedFrontBack/sharedTypes.js';

const io = geckos();
io.listen(8080);

let crumbs = new Crumbs();
let snakes: Snake[] = [];
let worldGrid = new WorldGrid(snakes, crumbs.crumbs);

io.onConnection(function connection(channel) {
  console.log("UDP connected");
  
  console.log(channel.id);
  let name: string = "";
  if(channel.id !== undefined){
    name = channel.id;
  } else{
    name = Math.random.toString();
  }
  const snake = new Snake(name, worldGrid);
  snakes.push(snake);
  worldGrid.addSnake(snake);

  channel.onDisconnect(() => {
    console.log("managing close");
    killSnake(snake);
  });
  
  channel.on("message", (data: Data) => {
    let recievedData = data as clientToServerMessage; // Data is (string|number|object), parse as clientToServerMessage
    snake.setInputAngle(recievedData.angle);
    snake.setPressed(recievedData.mousePressed);
  });

  // loop for sending data client
  (async ()=>{
    setInterval(()=>{
      let snakeFacts: {[id: string]: SnakeFact} = {};
      for(let snake of snakes){
        snakeFacts[snake.name] = {radius: snake.radius, color: snake.color};
      }
      let yourHead = {x: snake.segments[0].x, y: snake.segments[0].y};
      let gridData = worldGrid.getNearbyData(snake);
      let message = {...gridData, ...{snakeFacts}, ...{yourDirection: snake.direction, yourHead: yourHead}};
      channel.emit('message', message);
    }, 16)
  })()
});

// loop for updating world
(async ()=>{
  setInterval(() => {
    for(let snake of snakes){
      snake.update();
    }
    checkForSnakeSnakeCollisions();
    checkForSnakeCrumbCollisions();
    worldGrid.update();
  }, 16);
} )()

/**
 * Removes snake and moves a crumb to where each of its segments are with probability CRUMBS_ON_DEATH.
 * @param snake snake to remove
 */
const killSnake = (snake: Snake)=>{
  for(let segment of snake.segments){
    if(Math.random() < CRUMBS_ON_DEATH){
      crumbs.moveCrumb(segment.x, segment.y);
    }
  }
  worldGrid.removeSnake(snake);
  
  // idea for below taken from Stack Overflow
  // the below code effectively filters an array but does it in place, mutating the original array;
  for (let l = snakes.length - 1; l >= 0; l -= 1) {
    if ((snakes[l] == snake)){
      snakes.splice(l, 1);
    }
  }
}

// Improvement: change this function to use grid
/**
 * Checks for collisions of every snake head with every other snake's body segments.
 * If a collision is detected, killSnake is called
 */
const checkForSnakeSnakeCollisions = ()=>{
  // O(#snakes * #segments) implementation
  for(let currentSnake of snakes){
    let currentHead = currentSnake.head;
    for(let otherSnake of snakes.filter(s=> s != currentSnake)){
      // check for collision with every circle of body of other snake
      for(let i = 1; i < otherSnake.segments.length; i++){
        let otherSegment = otherSnake.segments[i];
        let distance = Math.sqrt((currentHead.x - otherSegment.x)**2+(currentHead.y - otherSegment.y)**2);
        let radiusSum = currentSnake.radius + otherSnake.radius;
        if(distance < radiusSum){
          killSnake(currentSnake);
        }
      }
    }
  }
}

// Improvement: change this function to use grid
/**
 * Checks for collisions of every snake head with every crumb on the map (in the World object);
 * If a collision is detected, the crumb moved to a new location on the map and snake.grow() is called.
 */
const checkForSnakeCrumbCollisions = () => {
// O(#snakes * #segments) implementation
  for(let currentSnake of snakes){
    let currentHead = currentSnake.head;
    // check for collision with every crumb in crumbs
    for(let crumb of crumbs.crumbs){
      let distance = Math.sqrt((currentHead.x - crumb.x)**2+(currentHead.y - crumb.y)**2);
      if(distance < (currentSnake.radius+CRUMB_RADIUS)){
        // move crumb to a random location on the map (instead of removing a crumb and readding)
        crumbs.repositionCrumb(crumb);
        currentSnake.grow();
      }
    }
  }
}