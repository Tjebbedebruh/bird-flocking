// Size of canvas. These get updated to fill the whole browser.
let width = 150;
let height = 150;

const numBoids = 100;
const visualRangeBoid = 75;
const visualRangePredator = 100;

const numPredators = 1;
const DRAW_TRAIL = false;
const strategy = "closest";

var boids = [];
var predators = [];

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
      x: Math.random() * width,
      y: Math.random() * height,
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

// Returns the boid that is closest to the given predator
function predatorsClosestBoid(predator) {
  // Make a copy
  const sorted = boids.slice();
  // Sort the copy by distance from predator to boid
  sorted.sort((a, b) => distance(predator, a) - distance(predator, b));
  // Return the closest boid
  return sorted[0];
}

function chaseClosestBoid(predator){
  const boid = predatorsClosestBoid(predator);
  const chaseFactor = 0.05; // Adjust velocity by this %

  const moveX = boid.x - predator.x;
  const moveY = boid.y - predator.y;
 
  predator.dx += moveX * chaseFactor;
  predator.dy += moveY * chaseFactor;
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
  
  const margin = 200;
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
  const centeringFactor = 0.005; // adjust velocity by this %

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
  const minDistance = 20; // The distance to stay away from other boids
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
  const matchingFactor = 0.05; // Adjust by this % of average velocity

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
  const speedLimit = 15; // initial value was 15

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
    if (strategy == "closest") {
      chaseClosestBoid(predator);
      keepWithinBounds(predator);
      limitSpeed(predator);

      // Update the position based on the current velocity
      predator.x += predator.dx;
      predator.y += predator.dy;
      predator.history.push([predator.x, predator.y])
      predator.history = predator.history.slice(-50);
    }
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

  // Schedule the next frame when no boid has been captured
  if (boids.length = numBoids){
    window.requestAnimationFrame(animationLoop);

  }
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
