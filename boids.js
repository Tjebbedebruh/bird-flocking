// Size of canvas. These get updated to fill the whole browser.
let width = 150;
let height = 150;

// Strategy's 
const Strategy = Object.freeze({ // enum
  CLOSEST: "closest",
  PERSUIT: "persuit",
  AMBUSH: "ambush",
});

// State booleans
let settingsOpen = false; 
let simulationRunning = false; 

// Simulation settings
let numBoids = 100; // Amount of Boids on the canvas
let visualRangeBoid = 75; // Visual range of the boids
let visualRangePredator = 75; // Visual range of the predators
let speedLimit = 15;  // Speed limit of the birds
let minDistance = 20; // Minimum distance between boids
let centeringFactor = 0.005; // Determines the coherence between boids 
let matchingFactor = 0.05; // Determines the alignment between boids 
var currentStrategy = Strategy.CLOSEST; // Strategy to use for the predator
let DRAW_TRAIL = false; // Draw the trail of the boids

// Birds
var boids = [];
var predator;

let allSimulationData = []; // Array to holds the data of multiple simulation rounds
var amountOfCaptures = 0; // amount of boids that have been captured

// Excel data to be exported
let wb = XLSX.utils.book_new();

// Data to be collected
let simulationData = {
  settings: {}, 
  captures: [],  // Array to hold the timestamps of the captures
  positionPredator: [], // Array to hold the positions of the predators
  simulationStartTime: Date.now(), // Default start time of the simulation 
  simulationEndTime: Date.now(), // Default end time of the simulation such that the total time is 0
  simulationTotalTime: 0, // Total time of the simulation
  traveledDistance: 0 // Distance traveled by the predator
};

/*********** Settings Menu ***********/
const settingsMenu = document.getElementById("settings-menu");
const settingsToggle = document.getElementById("settings-toggle")
const numBoidsSelect = document.getElementById("numBoidsSelect");
const coherenceSelect = document.getElementById("coherenceSelect"); 
const seperationSelect = document.getElementById("seperationSelect");
const alignmentSelect = document.getElementById("alignmentSelect");
const visualRangeBoidSelect = document.getElementById("visualRangeBoidSelect");
const visualRangePredatorSelect = document.getElementById("visualRangePredatorSelect");
const birdSpeedSelect  = document.getElementById("birdSpeedSelect");
const strategySelect = document.getElementById("strategySelect");
const startButton = document.getElementById("startButton");
const exportDataButton = document.getElementById("exportDataButton");


// *********** Event Listeners ***********/ 
// Settings menu toggle
settingsToggle.addEventListener("click", () => {
  settingsMenu.style.display = settingsOpen ? "none" : "flex";
  settingsOpen = !settingsOpen;
});

// Number of boids
numBoidsSelect.addEventListener("change", () => {
  numBoids = parseInt(numBoidsSelect.value);
  resetSimulation();
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

// Strategy
strategySelect.addEventListener("change", () => { 
  currentStrategy = strategySelect.value;
}); 

// Start button
startButton.addEventListener("click", () => {
  toggleSimulation()
});

// Export data button
exportDataButton.addEventListener("click", () => {
  addDataToArray();
  exportData();
});


/************ Setup Model ***********/
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

function initPredator() {
  predator = {
    x: width / 2,
    y: height / 2,
    dx: Math.random() * 10 - 5,
    dy: Math.random() * 10 - 5,
    history: [],  // For drawing the trail
  };
}


// ************ Simulation ***********/
function nClosestBoids(boid, n) {
  // Make a copy
  const sorted = boids.slice();
  // Sort the copy by distance from `boid`
  sorted.sort((a, b) => distance(boid, a) - distance(boid, b));
  // Return the `n` closest
  return sorted.slice(1, n + 1);
}

// ************ Predator Strategy's ***********/
// The predator will not move if there are no boids in the visual range 
// But if there are boids in the visual range, the predator will move towards the closest boid
function chaseAmbush(predator){
  const boid = predatorsClosestBoid(predator);
  const chaseFactor = 0.05; // Adjust velocity by this %

  let moveX = 0;
  let moveY = 0;

  if (distance(boid,predator) < visualRangePredator){
    moveX = boid.x - predator.x;
    moveY = boid.y - predator.y; 
  }
  predator.dx += moveX * chaseFactor;
  predator.dy += moveY * chaseFactor;
}

// The predator will choose a random boid and chase it
let randomBoid = Math.floor(Math.random() * boids.length);

function chasePersuit(predator){
  const boid = boids[randomBoid];
  const chaseFactor = 0.05; // Adjust velocity by this %

  const moveX = boid.x - predator.x;
  const moveY = boid.y - predator.y;
 
  predator.dx += moveX * chaseFactor;
  predator.dy += moveY * chaseFactor;
}

// The predator will repeatedly move towards the closest boid
function chaseClosest(predator){
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
  const turnFactor = 5;

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

  if (distance(boid, predator) < visualRangeBoid) {
    moveX += boid.x - predator.x;
    moveY += boid.y - predator.y;
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

function distance(boid1, boid2) {
  return Math.sqrt(
    (boid1.x - boid2.x) * (boid1.x - boid2.x) +
      (boid1.y - boid2.y) * (boid1.y - boid2.y),
  );
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

function toggleSimulation() {
  if (!simulationRunning) {
    runSimulation();
    window.requestAnimationFrame(animationLoop);
  } else {
    simulationRunning = false;
    startButton.style.backgroundColor = "#52c655"; 
    startButton.value = "Start";
    simulationData.simulationEndTime = Date.now();
  }
}

function runSimulation() {
  simulationRunning = true;
  startButton.style.backgroundColor = "#d33f3f"; 
  startButton.value = "Stop";

  // Start collecting data
  simulationData.settings = {
    numBoids: numBoids,
    coherence: centeringFactor,
    seperation: minDistance,
    alignment: matchingFactor,
    visualRangeBoid: visualRangeBoid,
    visualRangePredator: visualRangePredator,
    speedLimit: speedLimit,
    strategy: currentStrategy,
    width: width,
    height: height,
  };
  simulationData.simulationStartTime = Date.now();
}

function addDataToArray() {

  // Add the missing data from the simulation to the simulationData 
  simulationData.simulationEndTime = Date.now();
  simulationData.totalTime = simulationData.simulationEndTime - simulationData.simulationStartTime;

  // Create a new row for the data from this rounds simulation
  const dataRow = [
    simulationData.settings.numBoids,
    simulationData.settings.visualRangeBoid,
    simulationData.settings.visualRangePredator,
    simulationData.settings.speedLimit,
    simulationData.settings.seperation,
    simulationData.settings.coherence,
    simulationData.settings.alignment,
    simulationData.settings.strategy,
    simulationData.totalTime,
    simulationData.captures.length,
    parseFloat(simulationData.traveledDistance.toFixed(2))
  ];
  
  // Add the data to the array which contains all the data from all simulation rounds
  allSimulationData.push(dataRow);
}


function exportData() {

  // Excel column headers
  const headers = [
    "Number of Boids", 
    "Visual Range (Boid)", 
    "Visual Range (Predator)", 
    "Speed Limit", 
    "Min Distance", 
    "Centering Factor", 
    "Matching Factor", 
    "Predator Strategy", 
    "Total Time (ms)", 
    "Captures", 
    "Traveled Distance"
  ];

  // Convert to Excel
  const ws = XLSX.utils.aoa_to_sheet([headers, ...allSimulationData]);
  XLSX.utils.book_append_sheet(wb, ws, "Simulation Data");

  // Save the workbook to a file
  XLSX.writeFile(wb, "simulation_data.xlsx");

  // Clear the stored data after exporting
  allSimulationData = [];
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

  // Strategy select
  if (currentStrategy == Strategy.CLOSEST){ 
    chaseClosest(predator);
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

  simulationData.traveledDistance += Math.sqrt(predator.dx * predator.dx + predator.dy * predator.dy);
  simulationData.positionPredator.push([predator.x, predator.y]);
  
  capturedBoids = boids.filter(boid => distance(predator, boid) < 5);
  for (i = 0; i < capturedBoids.length; i++){
    simulationData.captures.push(Date.now() - simulationData.simulationStartTime);
  }

  // Remove a captured boid from boids
  boids = boids.filter(boid => distance(predator, boid) >= 5);

  const boidsCapturedCounter = document.getElementById("boidsCapturedCounter");
  amountOfCaptures += capturedBoids.length;
  boidsCapturedCounter.innerHTML = "Amount of birds captured: " + amountOfCaptures;

  // Clear the canvas and redraw all the boids in their current positions
  const ctx = document.getElementById("boids").getContext("2d");
  ctx.clearRect(0, 0, width, height);
  for (let boid of boids) {
    drawBoid(ctx, boid);
  }
  
  drawPredator(ctx, predator);

  // If the simulation has ended, collect data and then run again
  if (boids.length == 0) {
    simulationRunning = false;
    addDataToArray();
    resetSimulation();
    runSimulation();
  }

  if (simulationRunning){
    window.requestAnimationFrame(animationLoop);
  }
}

function resetSimulation () {
  boids = [];
  amountOfCaptures = 0;
  initBoids();
  initPredator();

  simulationData = {
    settings: {},
    captures: [],
    positionPredator: [],
    simulationStartTime: null,
    simulationEndTime: null,
    traveledDistance: 0
  };
}


window.onload = () => {
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  resetSimulation();
};