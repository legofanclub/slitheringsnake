import geckos from '@geckos.io/client'
import { CRUMB_RADIUS, TILE_SIZE, WORLD_SIZE } from "./sharedFrontBack/WorldVariables.js";
import { clientToServerMessage, serverToClientMessage, SimpleCrumb, SimpleSegment, SnakeFact } from "./sharedFrontBack/sharedTypes.js";
import * as TimSort from 'timsort';

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;

// cache drawing of crumb for reuse
const crumbDrawing = new Path2D;
crumbDrawing.arc(0, 0, CRUMB_RADIUS, 0, 2 * Math.PI);

let mousePressed = false; //invariant: mouse pressed state
let mouseX = -1; //invariant: mouse x position from canvas (0,0)
let mouseY = -1; //invariant: mouse y position from canvas (0,0)
addEventHandlersForMouse();

// geckos.io communication channel
let channel;

// below are values only used in debugging
let DEBUG = false;
let scale = 1;

// below are all data that are set by incoming server messages
let snakesRecieved: { [name: string]: SimpleSegment[] } = {};
let snakeFacts: SnakeFact[];
let crumbs: SimpleCrumb[] = [];
let tilePositions: { x: number, y: number }[] = [];
let yourDirection: number = 0;
let yourHead = { x: 0, y: 0 };


channel = geckos({ port: 8080 });
channel.onConnect(() => {
  console.log("connected");
  // send mouse position to server ~twice as often as draw
  (async () => {
    setInterval(() => {
      sendMouseHeadAngleAndPressedState();
    }, 8);
  })();

  // draw ~60 fps
  (async () => {
    setInterval(() => {
      draw();
    }, 16);
  })();
});

channel.on('message', (message: serverToClientMessage) => {
  let messageParsed = message;
  crumbs = messageParsed.crumbs;
  tilePositions = messageParsed.tilePositions;
  snakeFacts = messageParsed.snakeFacts;
  yourDirection = messageParsed.yourDirection;
  yourHead = messageParsed.yourHead;
  updateSnakes(messageParsed.segments);
});

/**
 * Draws everything to canvas. Called 60 times per second.
 */
function draw() {
  if(DEBUG){
    scale = 720/WORLD_SIZE;
  }

  ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-yourHead.x, -yourHead.y);
      
        drawMap();

        if (DEBUG) {
          drawSentSquareLocations();
        }

        drawCrumbs();
        drawAllSnakes();
  ctx.restore();
}

/**
 * Sends angle between snake head and mouse to server.
 */
const sendMouseHeadAngleAndPressedState = () => {
  let mouseHeadAngle = computeAngle();
  let message: clientToServerMessage = { angle: mouseHeadAngle, mousePressed: mousePressed };
  channel.emit('message', message);
}

/**
 * @returns angle from snake head to mouse cursor
 */
const computeAngle = (): number => {
  let xDist = mouseX - (canvas.width / 2);
  let yDist = mouseY - (canvas.height / 2);

  let a = { x: xDist, y: yDist };
  let b = { x: Math.cos(yourDirection), y: -Math.sin(yourDirection) }
  //line below from StackOverflow https://stackoverflow.com/a/2150475
  let angle = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);

  return (angle);
}

function drawAllSnakes() {
  for (let name in snakesRecieved) {
    drawSingleSnake(name);
  }
}

/**
 * Draws a single snake to the canvas. Slow when >200 segments.
 * @param name name of snake to draw
 */
function drawSingleSnake(name: string) {
  ctx.save();
  let snake = snakeFacts[name];
  ctx.fillStyle = snake.color;
  
  const bodySegment = new Path2D()
  bodySegment.arc(0, 0, snake.radius, 0, 2 * Math.PI);
  
  let segments = snakesRecieved[name];
  for (let i = segments.length - 1; i >= 0; i--) {
    ctx.translate(segments[i].x, segments[i].y);
      ctx.fill(bodySegment);
      ctx.stroke(bodySegment);
    ctx.translate(-segments[i].x, -segments[i].y);
  }
  ctx.restore();
}

const drawCrumbs = () => {
  ctx.fillStyle = "white";
  for (let crumb of crumbs) {
    ctx.translate(crumb.x, crumb.y);
      ctx.fill(crumbDrawing);
    ctx.translate(-crumb.x, -crumb.y);
  }
}

function drawSentSquareLocations() {
  for (let squareLocation of tilePositions) {
    ctx.fillStyle = "rgba(255, 200, 200, 0.5)";
    ctx.fillRect(squareLocation.x * TILE_SIZE, squareLocation.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.strokeRect(squareLocation.x * TILE_SIZE, squareLocation.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
}

function updateSnakes(sentSegments: {[name: string] : SimpleSegment[]},) {

  // group segments by name
  snakesRecieved = sentSegments;

  // sort segments for each snake
  for (let key in snakesRecieved) {
    // sort segments by index, TimSort because segments have some pre-ordering
    TimSort.sort(snakesRecieved[key], (first, second) => { return (first.index - second.index) });
  }
}

function drawMap() {
  //draw beyoned map area
  ctx.fillStyle = "black";
  ctx.fillRect(-800, -800, WORLD_SIZE + 1600, WORLD_SIZE + 1600);

  //draw map background
  ctx.fillStyle = "lightgrey";
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
}

function addEventHandlersForMouse() {
  // maintains invariant for mouseX and mouseY
  // taken from StackOverflow
  // https://stackoverflow.com/a/8993124
  document.onmousemove = (evt) => {
    let rect = canvas.getBoundingClientRect();
    mouseX = evt.clientX - rect.left;
    mouseY = evt.clientY - rect.top;
  }

  // maintains invariant for mousePressed
  document.onmousedown = (e) => {
    mousePressed = true;
  }

  // maintains invariant for mousePressed
  document.onmouseup = (e) => {
    mousePressed = false;
  }
}