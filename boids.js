// Size of canvas. These get updated to fill the whole browser.
let width = 150;
let height = 150;

const Strategy = Object.freeze({ // enum
  CLOSEST: "closest",
  PERSUIT: "persuit",
  AMBUSH: "ambush",
});
var currentStrategy = Strategy.CLOSEST;

let numBoids = 100; // Amount of Boids on the canvas
let visualRangeBoid = 75; // Visual range of the boids
let visualRangePredator = 100; // Visual range of the predators
let speedLimit = 15;  // Speed limit of the birds
let minDistance = 20; // Minimum distance between boids
let centeringFactor = 0.005; // Determines the coherence between boids 
let matchingFactor = 0.05; // Determines the alignment between boids 


let numPredators = 1;
let DRAW_TRAIL = false;

var boids = [];
var predators = [];

/*********** Settings Menu ***********/
const settingsMenu = document.getElementById("settings-menu");
const settingsToggle = document.getElementById("settings-toggle");
let settingsOpen = false; 

const numBoidsSelect = document.getElementById("numBoidsSelect");
const coherenceSelect = document.getElementById("coherenceSelect"); 
const seperationSelect = document.getElementById("seperationSelect");
const alignmentSelect = document.getElementById("alignmentSelect");
const visualRangeBoidSelect = document.getElementById("visualRangeBoidSelect");
const visualRangePredatorSelect = document.getElementById("visualRangePredatorSelect");
const birdSpeedSelect  = document.getElementById("birdSpeedSelect");
const strategySelect = document.getElementById("strategySelect");

// Settings menu toggle
settingsToggle.addEventListener("click", () => {
  settingsMenu.style.display = settingsOpen ? "none" : "flex";
  settingsOpen = !settingsOpen;
});

// Number of boids
numBoidsSelect.addEventListener("change", () => {
  console.log("numBoidsSelect.value: ", numBoidsSelect.value);
  numBoids = parseInt(numBoidsSelect.value);
  resetAnimation();
});

// Coherence 
coherenceSelect.addEventListener("change", () => {
  centeringFactor = parseFloat(coherenceSelect.value/10000);
});

// Seperation
seperationSelect.addEventListener("change", () => {
  minDistance = parseInt(seperationSelect.value);
});

// Alignment
alignmentSelect.addEventListener("change", () => {
  matchingFactor = parseFloat(alignmentSelect.value/1000);
});

// Visual range boids
visualRangeBoidSelect.addEventListener("change", () => {
  visualRangeBoid = parseInt(visualRangeBoidSelect.value);
});

// Visual range predators
visualRangePredatorSelect.addEventListener("change", () => {
  visualRangePredator = parseInt(visualRangePredatorSelect.value);
});

// Bird speed
birdSpeedSelect.addEventListener("change", () => {
  speedLimit = parseInt(birdSpeedSelect.value);
});

/* strategySelect.addEventListener("change", () => { // TODO: uncomment this after implmenting all the other strategies
  currentStrategy = strategySelect.value;
}); */

/************ Model ***********/

function initBoids() {
  for (var i = 0; i < numBoids; i += 1) {
    boids[boids.length] = {
      x: Math.random() * width,
      y: Math.random() * height,
      dx: Math.random() * 10 - 5,
      dy: Math.random() * 10 - 5,
      history: [],  // For drawing the trail	
    };
  }
}

function initPredators() {
  for (var i = 0; i < numPredators; i += 1) {
    predators[predators.length] = {
      x: width / 2,
      y: height / 2,
      dx: Math.random() * 10 - 5,
      dy: Math.random() * 10 - 5,
      history: [],  // For drawing the trail
    };
  }
}

function distance(boid1, boid2) {
  return Math.sqrt(
    (boid1.x - boid2.x) * (boid1.x - boid2.x) +
      (boid1.y - boid2.y) * (boid1.y - boid2.y),
  );
}


function nClosestBoids(boid, n) {
  // Make a copy
  const sorted = boids.slice();
  // Sort the copy by distance from `boid`
  sorted.sort((a, b) => distance(boid, a) - distance(boid, b));
  // Return the `n` closest
  return sorted.slice(1, n + 1);
}

function chaseAmbush(predator){
  const boid = predatorsClosestBoid(predator);
  const chaseFactor = 0.05; // Adjust velocity by this %

  let moveX = 0;
  let moveY = 0;

  if (distance(boid,predator) < 75){
    moveX = boid.x - predator.x;
    moveY = boid.y - predator.y; 
  }
  predator.dx += moveX * chaseFactor;
  predator.dy += moveY * chaseFactor;
}

let randomBoid = Math.floor(Math.random() * boids.length);

function chasePersuit(predator){
  const boid = boids[randomBoid];
  const chaseFactor = 0.05; // Adjust velocity by this %

  const moveX = boid.x - predator.x;
  const moveY = boid.y - predator.y;
 
  predator.dx += moveX * chaseFactor;
  predator.dy += moveY * chaseFactor;
}

function chaseCloses(predator){
  const boid = predatorsClosestBoid(predator);
  const chaseFactor = 0.05; // Adjust velocity by this %

  const moveX = boid.x - predator.x;
  const moveY = boid.y - predator.y;
 
  predator.dx += moveX * chaseFactor;
  predator.dy += moveY * chaseFactor;
}

// Returns the boid that is closest to the given predator
function predatorsClosestBoid(predator) {
  // Make a copy
  const sorted = boids.slice();
  // Sort the copy by distance from predator to boid
  sorted.sort((a, b) => distance(predator, a) - distance(predator, b));
  // Return the closest boid
  return sorted[0];
}

// Called initially and whenever the window resizes to update the canvas
// size and width/height variables.
function sizeCanvas() {
  const canvas = document.getElementById("boids");
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

// Constrain a bird to within the window. If it gets too close to an edge,
// nudge it back in and reverse its direction.
function keepWithinBounds(bird) {
  
  const margin = 50;
  const turnFactor = 3;

  if (bird.x < margin) {
    bird.dx += turnFactor;
  }
  if (bird.x > width - margin) {
    bird.dx -= turnFactor
  }
  if (bird.y < margin) {
    bird.dy += turnFactor;
  }
  if (bird.y > height - margin) {
    bird.dy -= turnFactor;
  }
}

// Find the center of mass of the other boids and adjust velocity slightly to
// point towards the center of mass.
function flyTowardsCenter(boid) {
  let centerX = 0;
  let centerY = 0;
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (distance(boid, otherBoid) < visualRangeBoid) {
      centerX += otherBoid.x;
      centerY += otherBoid.y;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    centerX = centerX / numNeighbors;
    centerY = centerY / numNeighbors;

    boid.dx += (centerX - boid.x) * centeringFactor;
    boid.dy += (centerY - boid.y) * centeringFactor;
  }
}

// Move away from other boids that are too close to avoid colliding
function avoidOthers(boid) {
  const avoidFactor = 0.05; // Adjust velocity by this %
  let moveX = 0;
  let moveY = 0;
  for (let otherBoid of boids) {
    if (otherBoid !== boid) {
      if (distance(boid, otherBoid) < minDistance) {
        moveX += boid.x - otherBoid.x;
        moveY += boid.y - otherBoid.y;
      }
    }
  }

  boid.dx += moveX * avoidFactor;
  boid.dy += moveY * avoidFactor;
}

// Move away from predators that are too close to the boid to avoid being caught
function avoidPredators(boid) {
  const avoidFactor = 0.05; // Adjust velocity by this %
  let moveX = 0;
  let moveY = 0;
  for (let predator of predators) {
    if (distance(boid, predator) < visualRangeBoid) {
      moveX += boid.x - predator.x;
      moveY += boid.y - predator.y;
    }
  }

  boid.dx += moveX * avoidFactor;
  boid.dy += moveY * avoidFactor;
}

// Find the average velocity (speed and direction) of the other boids and
// adjust velocity slightly to match.
function matchVelocity(boid) {

  let avgDX = 0;
  let avgDY = 0;
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (distance(boid, otherBoid) < visualRangeBoid) {
      avgDX += otherBoid.dx;
      avgDY += otherBoid.dy;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    avgDX = avgDX / numNeighbors;
    avgDY = avgDY / numNeighbors;

    boid.dx += (avgDX - boid.dx) * matchingFactor;
    boid.dy += (avgDY - boid.dy) * matchingFactor;
  }
}

// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function limitSpeed(bird) {
  const speed = Math.sqrt(bird.dx * bird.dx + bird.dy * bird.dy);
  if (speed > speedLimit) {
    bird.dx = (bird.dx / speed) * speedLimit;
    bird.dy = (bird.dy / speed) * speedLimit;
  }
}

function drawPredator(ctx, predator) {
  const angle = Math.atan2(predator.dy, predator.dx);
  ctx.translate(predator.x, predator.y);
  ctx.rotate(angle);
  ctx.translate(-predator.x, -predator.y);
  ctx.fillStyle = "#ff0000";
  ctx.beginPath();
  ctx.moveTo(predator.x, predator.y);
  ctx.lineTo(predator.x - 15, predator.y + 5);
  ctx.lineTo(predator.x - 15, predator.y - 5);
  ctx.lineTo(predator.x, predator.y);
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}


function drawBoid(ctx, boid) {
  const angle = Math.atan2(boid.dy, boid.dx);
  ctx.translate(boid.x, boid.y);
  ctx.rotate(angle);
  ctx.translate(-boid.x, -boid.y);
  ctx.fillStyle = "#558cf4";
  ctx.beginPath();
  ctx.moveTo(boid.x, boid.y);
  ctx.lineTo(boid.x - 15, boid.y + 5);
  ctx.lineTo(boid.x - 15, boid.y - 5);
  ctx.lineTo(boid.x, boid.y);
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (DRAW_TRAIL) {
    ctx.strokeStyle = "#558cf466";
    ctx.beginPath();
    ctx.moveTo(boid.history[0][0], boid.history[0][1]);
    for (const point of boid.history) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();
  }
}

// Main animation loop
function animationLoop() {
  // Update each boid
  for (let boid of boids) {
    // Update the velocities according to each rule
    flyTowardsCenter(boid);
    avoidOthers(boid);
    avoidPredators(boid);
    matchVelocity(boid);
    keepWithinBounds(boid);
    limitSpeed(boid);

    // Update the position based on the current velocity
    boid.x += boid.dx;
    boid.y += boid.dy;
    boid.history.push([boid.x, boid.y])
    boid.history = boid.history.slice(-50);
  }

  for (let predator of predators){
    if (currentStrategy == Strategy.CLOSEST){ 
      chaseCloses(predator);
    }
    else if (currentStrategy == Strategy.PERSUIT){
      chasePersuit(predator);
    }
    else if (currentStrategy == Strategy.AMBUSH){
      chaseAmbush(predator);
    }

    keepWithinBounds(predator);
    limitSpeed(predator);

    // Update the position based on the current velocity
    predator.x += predator.dx;
    predator.y += predator.dy;
    predator.history.push([predator.x, predator.y])
    predator.history = predator.history.slice(-50);
  }
  
  // Remove a captured boid from boids
  for(let predator of predators){
    boids = boids.filter(boid => distance(predator, boid) >= 5);
  }

  // Clear the canvas and redraw all the boids in their current positions
  const ctx = document.getElementById("boids").getContext("2d");
  ctx.clearRect(0, 0, width, height);
  for (let boid of boids) {
    drawBoid(ctx, boid);
  }
  for (let predator of predators) {
    drawPredator(ctx, predator);
  }

  // Schedule the next frame when no boid has been captured // TODO: removed for settings menu testing. Can be returned later
  // if (boids.length === numBoids){
  //   window.requestAnimationFrame(animationLoop);
  // } 

    window.requestAnimationFrame(animationLoop);
}

function resetAnimation () {
  boids = [];
  predators = [];
  initBoids();
  initPredators();
}


window.onload = () => {
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  // Randomly distribute the boids to start
  initBoids();
  initPredators();

  // Schedule the main animation loop
  window.requestAnimationFrame(animationLoop);


};
