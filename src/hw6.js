import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// 4 corner spotlights like a stadium
const ballPosition = new THREE.Vector3(0, 2, 0);
const spotLightPositions = [
  [-17, 10, -8.5],
  [17, 10, -8.5],
  [-17, 10, 8.5],
  [17, 10, 8.5],
];

spotLightPositions.forEach((pos) => {
  const light = new THREE.SpotLight(0xffffff, 2);
  light.position.set(...pos);
  light.angle = Math.PI / 24;
  light.penumbra = 0.4;
  light.decay = 1.5;
  light.distance = 50;
  light.target.position.copy(ballPosition);
  light.castShadow = true;
  scene.add(light);
  scene.add(light.target);
});

// Two stronger lights behind each hoop
const cornerLightPositions = [
  [-17, 15, 0],
  [17, 15, 0],
];

cornerLightPositions.forEach((pos, i) => {
  const light = new THREE.PointLight(0xffffff, 0.45, 100);
  light.position.set(...pos);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  scene.add(light);
});

// Enable shadows
renderer.shadowMap.enabled = true;

// Create basketball court
function createBasketballCourt() {
  // MATERIALS -----------------------------------------------------------------------------------------------------------------
  const loader = new THREE.TextureLoader();

  // Wood material -------------------------------------------------
  const woodBase = loader.load('src/textures/wood/base.png');
  const woodNormal = loader.load('src/textures/wood/normal.png');
  const woodRough = loader.load('src/textures/wood/rough.png');
  const woodAO = loader.load('src/textures/wood/AO.png');

  [woodBase, woodNormal, woodRough, woodAO].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
  });

  const woodMaterial = new THREE.MeshStandardMaterial({
    map: woodBase,
    normalMap: woodNormal,
    roughnessMap: woodRough,
    aoMap: woodAO
  });

  // Basketball material ---------------------------------------------
  const basketballBase = loader.load('src/textures/basketball/ball.png');
  const basketballNormal = loader.load('src/textures/basketball/ball_normal.png');

  const basketballMaterial = new THREE.MeshStandardMaterial({
    map: basketballBase,
    normalMap: basketballNormal,
  });

  // White material for the court markings ---------------------------
  const courtMarkingsMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff
  });

  // Metal materials for the poles and hoop ---------------------------
  const blackMetalMaterial = new THREE.MeshPhongMaterial({
    color: 0x222333,
    specular: 0xffffff,
    shininess: 100
  });

  const orangeMetalMaterial = new THREE.MeshPhongMaterial({
    color: 0xff6700,
    specular: 0xffffff,
    shininess: 100
  });

  // Glass material  --------------------------------------------------
  const glassMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    shininess: 100,
    specular: 0xffffff,
    side: THREE.DoubleSide
  });

  // Net material  -----------------------------------------------------
  const netMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true
    });

  //HELPER FUNCTIONS -----------------------------------------------------------------------------------------------------------
  // Function to reduce the amount of repeated lines of code when creating meshes, like setting shadows and translations and rotations
  function makeMesh(geometry, material, {x=null,y=null,z=null, rx=null ,ry=null, rz=null, castShadow=true} = {}) {
    const mesh = new THREE.Mesh(geometry, material);
    if (x !== null) mesh.position.x = x;
    if (y !== null) mesh.position.y = y;
    if (z !== null) mesh.position.z = z;
    if (rx !== null) mesh.rotateX(rx);
    if (ry !== null) mesh.rotateY(ry);
    if (rz !== null) mesh.rotateZ(rz);
    mesh.receiveShadow = true;
    if (castShadow) mesh.castShadow = true;
    return mesh;
  }
  
  // Function to reduce the amount of lines of repeated code when cloning objects, mainly translation
  function mirror(mesh, {x=null, y=null, z=null} = {}) {
    const clone = mesh.clone();

    if (x !== null) clone.position.x = x;
    if (y !== null) clone.position.y = y;
    if (z !== null) clone.position.z = z;

    return clone;
  }

  // Function to simplify the creation of 'borders' (a torus-like box)
  function makeBorder(width, height, depth, thickness, material, {twoSided=false, castShadow=false} = {}){
    const border = new THREE.Group(); // group to hold the different components of the border

    const y_radius = height/2;
    const widthGeometry = new THREE.BoxGeometry(width+thickness, thickness, depth);
    const top = makeMesh(widthGeometry, material, {y: y_radius, castShadow: castShadow});

    const bottom = mirror(top, {y: -y_radius});

    border.add(top, bottom);

    if(!twoSided){ // if the border is only along one axis like a lane
      const x_radius = width/2;
      const heightGeometry = new THREE.BoxGeometry(thickness, height-thickness, depth);
      const right = makeMesh(heightGeometry, material, {x: x_radius, castShadow: castShadow});

      const left = mirror(right, {x: -x_radius});
      border.add(right, left);
    }

    return border;
  }

  // A function to create a hoop neatly in the future, returns a group of the components of the hoop for easy scaling and translation
  function makeHoop(x, flip = false){
    const hoop = new THREE.Group(); // group to hold the different components of the hoop

    const poleGeometry = new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS, POLE_HEIGHT, 32);
    const pole = makeMesh(poleGeometry, blackMetalMaterial, {x: 0.4, y: 4.8});
    hoop.add(pole);

    const baseGeometry = new THREE.BoxGeometry(2.04, backboardX, 1.68);
    const base = makeMesh(baseGeometry, blackMetalMaterial, {x: 0.04, y: 0.12});
    hoop.add(base);

    const diagArmGeometry = new THREE.CylinderGeometry(0.144, 0.144, 1.92, 32);
    const diagArm = makeMesh(diagArmGeometry, blackMetalMaterial, {x: 1.36, y: 8.844, rz: 2*Math.PI/3});
    hoop.add(diagArm);

    const armGeometry = new THREE.CylinderGeometry(0.144, 0.144, 1.68, 32);
    const arm = makeMesh(armGeometry, blackMetalMaterial, {x: 1.36, y: 9.24, rz: Math.PI/2});
    hoop.add(arm);

    const poleWeldGeometry = new THREE.BoxGeometry(backboardX, 0.48, 0.48);
    const poleWeld = makeMesh(poleWeldGeometry, blackMetalMaterial, {x: 2.104, y: 9.24});
    hoop.add(poleWeld);

    const backboardGeometry = new THREE.BoxGeometry(backboardX, backboardY, backboardZ);
    const backboard =  makeMesh(backboardGeometry, glassMaterial, {x: 2.344, y: 10.416});
    hoop.add(backboard);

    const backboardBorder = makeBorder(backboardZ, backboardY, backboardX, 0.024, courtMarkingsMaterial, {castShadow: true});
    backboardBorder.rotateY(Math.PI/2);
    backboardBorder.position.set(2.344, 10.416, 0);

    hoop.add(backboardBorder);

    const backboardInnerBox = mirror(backboardBorder, {y: 10.272});
    backboardInnerBox.scale.set(0.5, 0.5, 1);
    hoop.add(backboardInnerBox);

    const hoopRingGeometry = new THREE.TorusGeometry(NET_TOP_RADIUS, 0.09, 32, 100);
    const hoopRing = makeMesh(hoopRingGeometry, orangeMetalMaterial, {x: 3.8, y: 9.42, rx: -Math.PI / 2});
    hoop.add(hoopRing);

    const hoopBaseGeometry = new THREE.BoxGeometry(0.04, 0.4, 0.4);
    const hoopBaseVert = makeMesh(hoopBaseGeometry, orangeMetalMaterial, {x: 2.48, y: 9.24});
    hoop.add(hoopBaseVert);

    const hoopBaseHorz = mirror(hoopBaseVert, {x: 2.66, y: 9.42});
    hoopBaseHorz.rotateZ(-Math.PI / 2);
    hoop.add(hoopBaseHorz);

    const netGeometry = new THREE.CylinderGeometry(NET_TOP_RADIUS, NET_BOTTOM_RADIUS, NET_HEIGHT, 32, 1, true);
    const net = makeMesh(netGeometry, netMaterial, {x: 3.8, y: NET_Y, castShadow: false});
    hoop.add(net);

    if (flip) hoop.rotateY(Math.PI);
    hoop.position.x = x;
    return hoop;
  }
  
  // COURT FLOOR -----------------------------------------------------------------------------------------------------------------
  const courtGeometry = new THREE.BoxGeometry(courtWidth, 0.2, courtLength);
  courtGeometry.setAttribute('uv2', courtGeometry.attributes.uv);
  const court = makeMesh(courtGeometry, woodMaterial, {castShadow: false});
  scene.add(court);
  
  // BASKETBALL -----------------------------------------------------------------------------------------------------------------
  const basketballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);
  basketball = makeMesh(basketballGeometry, basketballMaterial, {y: 2, rx: Math.PI/2});
  scene.add(basketball);
  
  // COURT MARKINGS --------------------------------------------------------------------------------------------------------------
  // Thickness for court markings
  const markingsThickness = 0.1
  const courtMarkings = new THREE.Group();
  
  // Center line ----------------------------
  const centerLineGeometry = new THREE.BoxGeometry(markingsThickness, 0.01, courtBoundsLength);
  const centerLine = makeMesh(centerLineGeometry, courtMarkingsMaterial, {castShadow: false});

  // Court border ----------------------------
  const courtBorder = makeBorder(courtBoundsWidth, courtBoundsLength, 0.01, markingsThickness, courtMarkingsMaterial);
  courtBorder.rotateX(Math.PI / 2);
  
  // Center circle ---------------------------
  const circleMarkingGeometry = new THREE.RingGeometry(2 - markingsThickness, 2, 64);
  circleMarkingGeometry.rotateX(-Math.PI/2);

  const centerCircle = makeMesh(circleMarkingGeometry, courtMarkingsMaterial, {castShadow: false});

  // Free throw lines ---------------------------
  const leftFreeThrowCircle = mirror(centerCircle, {x: -10});

  const rightFreeThrowCircle = mirror(centerCircle, {x: 10});

  const freeThrowLineGeometry = new THREE.BoxGeometry(markingsThickness, 0.01, 4);
  const leftFreeThrowLine = makeMesh(freeThrowLineGeometry, courtMarkingsMaterial, {x: -10, castShadow: false});
  
  const rightFreeThrowLine = mirror(leftFreeThrowLine, {x: 10});

  const leftFreeThrowBorder = makeBorder(4.5, 3.9, 0.01, markingsThickness, courtMarkingsMaterial, {twoSided: true});
  leftFreeThrowBorder.rotateX(Math.PI/2);
  leftFreeThrowBorder.position.x = -12.25;

  const rightFreeThrowBorder = mirror(leftFreeThrowBorder, {x: 12.25});

  // 3 point lines ---------------------------
  const _3PointLinesGeometry = new THREE.RingGeometry(6 - markingsThickness, 6, 64, 1, Math.PI/2, Math.PI);
  const right3PointLines = makeMesh(_3PointLinesGeometry, courtMarkingsMaterial, {x: 13, rx: -Math.PI/2, castShadow: false});

  const left3PointLines = mirror(right3PointLines, {x: -13});
  left3PointLines.rotateZ(Math.PI);

  const left3PointArcExt = makeBorder(1.6, 11.9, 0.01, markingsThickness, courtMarkingsMaterial, {twoSided: true});
  left3PointArcExt.rotateX(Math.PI/2);
  left3PointArcExt.position.x = -13.7;

  const right3PointArcExt = mirror(left3PointArcExt, {x: 13.7});

  courtMarkings.add(centerLine, courtBorder, centerCircle, leftFreeThrowCircle, rightFreeThrowCircle, leftFreeThrowLine, rightFreeThrowLine, leftFreeThrowBorder, rightFreeThrowBorder, right3PointLines, left3PointLines, left3PointArcExt, right3PointArcExt);
  courtMarkings.position.y = 0.11;
  scene.add(courtMarkings);

  // Hoops --------------------------------------------------------------------------------------------------
  const leftHoop = makeHoop(-16);
  scene.add(leftHoop);

  const rightHoop = makeHoop(16, true);
  scene.add(rightHoop);
}

// Global variables and Constants ---------------------------------------------------------------------------

// Ball -----------------------------------------
let basketball;
let target;
const BALL_RADIUS = 0.5;

// Hoop positions
const hoopLeft  = new THREE.Vector3(-12.5, 7.88, 0);
const hoopRight = new THREE.Vector3( 12.5, 7.88, 0);

// Court ----------------------------------------
const courtWidth = 34;
const courtLength = 17;
const courtXRadius = courtWidth/2;
const courtZRadius = courtLength/2;
const courtBoundsWidth = 29;
const courtBoundsLength = 14;
const courtBoundXRadius = courtBoundsWidth/2;
const courtBoundZRadius = courtBoundsLength/2;

// Backboard
const backboardX = 0.24;
const backboardY = 3;
const backboardZ = 3.6;

// Shot Power -----------------------------------
let shotPower = 0.5; // 50% initially
const POWER_RATE = 0.5; // units per second when key held
const POWER_MIN = 0.0;
const POWER_MAX = 1.0;

// Physics ---------------------------------------
const GRAVITY = -9.8;
let isBallInFlight = false; // disables arrow-key drag while true
const MIN_BOUNCE = 0.4;

// Floor collision physics
const FLOOR_Y = 0.1 + BALL_RADIUS;
const RESTITUTION_GROUND = 0.6;
const FRICTION_GROUND = 0.8;

// Backboard collision physics
const backboardXRadius = backboardX * 0.5;
const backboardYRadius = backboardY * 0.5;
const backboardZRadius = backboardZ * 0.5;
const BACKBOARD_RESTITUTION = 0.75;
const leftBackboardCentre = new THREE.Vector3(-13.656, 10.416, 0);
const rightBackboardCentre = new THREE.Vector3(13.656, 10.416, 0);

// Pole collision physics
const POLE_RADIUS = 0.36;
const POLE_HEIGHT = 9.6;
const POLE_HALF_HEIGHT = POLE_HEIGHT * 0.5;
const POLE_RESTITUTION = 0.8;
const leftPoleCentre = new THREE.Vector3(-15.6, 4.8, 0);
const rightPoleCentre = new THREE.Vector3(15.6, 4.8, 0);

// Net collision physics
const NET_Y = 8.8;
const NET_TOP_RADIUS = 0.9;
const NET_BOTTOM_RADIUS = 0.6;
const NET_HEIGHT = 1.3;
const NET_RESTITUTION = 0.55;
const leftNetCentre = new THREE.Vector3(-12.2, 8.8, 0);
const rightNetCentre = new THREE.Vector3(12.2, 8.8, 0);

// Statistics tracking constants
let homeScore = 0;
let awayScore = 0;
let homeSuccessCounter = 0;
let awaySuccessCounter = 0;
let homeShotCounter = 0;
let awayShotCounter = 0;

// Create all elements
createBasketballCourt();

// BasketBall physics state
basketball.userData.velocity = new THREE.Vector3();
basketball.userData.prevPos = basketball.position.clone();
basketball.userData.axis = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

// Sounds ---------------------------------------------------------------------------------------------------

//Load sounds
const cheerSound = new Audio('src/sounds/cheer.mp3');
const booSound = new Audio('src/sounds/boo.mp3');
const bounceSound = new Audio('src/sounds/bounce.mp3');
const scoreSound = new Audio('src/sounds/score.mp3');
const comboSound = new Audio('src/sounds/combo.mp3');
const missSound = new Audio('src/sounds/miss.mp3');
const swishSound = new Audio('src/sounds/swish.mp3');

// Helper function
function playSound(sound){
  sound.currentTime = 0;
  sound.play();
}

// Trail ----------------------------------------------------------------------------------------------------
const trailPoints = [];
const maxTrailPoints = 40;

const trailMaterial = new THREE.LineBasicMaterial({
  color: 0xff6600,
  transparent: true,
  opacity: 0.5,
});

const trailGeometry = new THREE.BufferGeometry();
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trailLine);

// Orbit controls -------------------------------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Camera presets -------------------------------------------------------------------------------------------

// Different camera presets to switch between
const cameraPresets = [
  {
    name: "Default Overview",
    position: new THREE.Vector3(0, 15, 15),
    lookAt: new THREE.Vector3(0, 0, 0)
  },
  {
    name: "Center Left Hoop View",
    position: new THREE.Vector3(5, 2, 0),
    lookAt: new THREE.Vector3(-16, 8, 0)
  },
  {
    name: "Free Throw Left Hoop View",
    position: new THREE.Vector3(-10, 2, 0),
    lookAt: new THREE.Vector3(-16, 8, 0)
  },
  {
    name: "Behind Right Hoop",
    position: new THREE.Vector3(24, 23, 0),
    lookAt: new THREE.Vector3(0, 0, 0)
  }
];

// Function for camera preset switching on key press
function applyCameraPreset(index) {
  const preset = cameraPresets[index];
  camera.position.copy(preset.position);
  camera.lookAt(preset.lookAt);
  controls.target.copy(preset.lookAt);
  controls.update();
}

// Initially set camera preset to default view
let currentPresetIndex = 0;
applyCameraPreset(0);

// Instructions display --------------------------------------------------------------------------
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '12px';
instructionsElement.style.background = 'rgba(253, 41, 41, 0.85)';
instructionsElement.style.padding = '10px 20px';
instructionsElement.style.border = '3px solid #FFA500';
instructionsElement.style.borderRadius = '16px';
instructionsElement.style.boxShadow = '0 0 20px rgba(255, 140, 0, 0.7)';
instructionsElement.style.zIndex = '10';
instructionsElement.style.letterSpacing = '1px';
instructionsElement.style.fontWeight = 'bold';
instructionsElement.style.fontFamily = 'Orbitron, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <h3 style="margin: 0;">Controls:</h3>
    <button id="toggleInstructionsBtn" style="
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 0 6px;
      text-shadow: 0 0 8px #FFA500;
    ">–</button>
  </div>
  <div id="instructionsContent">
    <p>O - Toggle orbit camera</p>
    <p>C - Switch between camera presets</p>
    <p>←↑↓→ - Move ball</p>
    <p>W - Increase power</p>
    <p>S - Decrease power</p>
    <p>Space - Shoot ball</p>
    <p>R - Reset ball</p>
  </div>
`;
document.body.appendChild(instructionsElement);
const toggleBtn = document.getElementById('toggleInstructionsBtn');
const instructionsContent = document.getElementById('instructionsContent');

// Minimize logic ----------------------------------
toggleBtn.addEventListener('click', () => {
  const isVisible = instructionsContent.style.display !== 'none';
  instructionsContent.style.display = isVisible ? 'none' : 'block';
  toggleBtn.textContent = isVisible ? '+' : '–';
});

// Score Display ----------------------------------------------------------------------------------------------------
const scoreElement = document.createElement('div');
scoreElement.style.position = 'absolute';
scoreElement.style.top = '20px';
scoreElement.style.left = '50%';
scoreElement.style.transform = 'translateX(-50%)';
scoreElement.style.color = '#FFD700';
scoreElement.style.fontSize = '22px';
scoreElement.style.fontFamily = 'Orbitron, sans-serif';
scoreElement.style.textAlign = 'center';
scoreElement.style.background = 'rgba(253, 41, 41, 0.85)';
scoreElement.style.padding = '10px 20px';
scoreElement.style.border = '3px solid #FFA500';
scoreElement.style.borderRadius = '16px';
scoreElement.style.boxShadow = '0 0 20px rgba(255, 140, 0, 0.7)';
scoreElement.style.zIndex = '10';
scoreElement.style.letterSpacing = '2px';

scoreElement.innerHTML = `
  <div style="font-size: 18px; font-weight: bold; color: #fff; display: flex; justify-content: space-between; gap: 30px;">
    <span>HOME</span><span>AWAY</span>
  </div>
  <div style="display: flex; justify-content: center; align-items: center; gap: 30px; margin-top: 8px;">
    <div id="homeScore" style="font-size: 40px;">0</div>
    <div style="font-size: 30px;">:</div>
    <div id="awayScore" style="font-size: 40px;">0</div>
  </div>
`;

document.body.appendChild(scoreElement);

// Get the score elements for updating
const homeScoreElement = document.getElementById('homeScore');
const awayScoreElement = document.getElementById('awayScore');

// Statistics Display ----------------------------------------------------------------------------------------------------
function createStatsPanel(team, position, toggleDir) {
  const panel = document.createElement('div');
  panel.className = `stats-panel ${team}`;
  Object.assign(panel.style, {
    position: 'absolute',
    top: '23px',
    left: position,
    color: '#fff',
    fontSize: '12px',
    background: 'rgba(253, 41, 41, 0.85)',
    padding: '5px 10px',
    border: '3px solid #FFA500',
    borderRadius: '16px',
    boxShadow: '0 0 20px rgba(255, 140, 0, 0.7)',
    letterSpacing: '1px',
    fontWeight: 'bold',
    fontFamily: 'Orbitron, sans-serif',
    textAlign: 'center',
    width: '130px',
    height: '83px',
  });

  const titleId = `${team}Title`;
  const toggleId = `toggle${team[0].toUpperCase() + team.slice(1)}StatsBtn`;
  const contentId = `${team}StatsContent`;

  panel.innerHTML = `
    <div class="panel-header">
      <span id="${titleId}" class="title">${team.toUpperCase()} STATS</span>
      <button id="${toggleId}" class="toggle">${toggleDir}</button>
    </div>
    <div id="${contentId}" class="panel-content" style="font-size: 11px">
      <p style="margin: 5px 0;">Shots: <span id="${team}Attempts">0</span></p>
      <p style="margin: 5px 0;">Shots Made: <span id="${team}Successes">0</span></p>
      <p style="margin: 5px 0;">Accuracy: <span id="${team}Accuracy">0</span>%</p>
    </div>
  `;

  document.body.appendChild(panel);
  return panel;
}

// Create panel for each team
const homeStatsPanel = createStatsPanel('home', 'calc(50% - 267px)', '▶');
const awayStatsPanel = createStatsPanel('away', 'calc(50% + 111px)', '◀');

// Get elements for updating display
const homeAttemptsElement = document.getElementById('homeAttempts');
const awayAttemptsElement = document.getElementById('awayAttempts');
const homeSuccessElement = document.getElementById('homeSuccesses');
const awaySuccessElement = document.getElementById('awaySuccesses');
const homeAccElement = document.getElementById('homeAccuracy');
const awayAccElement = document.getElementById('awayAccuracy');

// The original settings for expanding back after minimizing
const ORIG = {
  home: { left: 'calc(50% - 267px)', top: '23px', width: '130px', padding: '5px 10px' },
  away: { left: 'calc(50% + 111px)', top: '23px', width: '130px', padding: '5px 10px' },
};

// Style for minimization
const style = document.createElement('style');
style.textContent = `
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .toggle {
    background: none;
    border: none;
    color: white;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    padding: 0 6px;
    text-shadow: 0 0 8px #FFA500;
  }
  .stats-panel.collapsed {
    width: 30px !important;
    padding: 6px 2px !important;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    overflow: hidden;
  }
  .stats-panel.collapsed .panel-content {
    display: none;
  }
  .stats-panel.home.collapsed {
    transform: rotate(180deg);
  }
  .stats-panel.away .title { order: 1; }
  .stats-panel.away .toggle { order: 2; }
  .stats-panel.away.collapsed .title { order: 2; }
  .stats-panel.away.collapsed .toggle { order: 1; }
`;
document.head.appendChild(style);

// State tracking
let collapsed = false;

// Minimizing logic ----------------------------------------
function updateUI() {
  document.getElementById('toggleAwayStatsBtn').textContent = collapsed ? '▶' : '◀';
  document.getElementById('homeTitle').textContent = collapsed ? 'STATS' : 'HOME STATS';
  document.getElementById('awayTitle').textContent = collapsed ? 'STATS' : 'AWAY STATS';
}

function togglePanels() {
  collapsed = !collapsed;
  homeStatsPanel.classList.toggle('collapsed', collapsed);
  awayStatsPanel.classList.toggle('collapsed', collapsed);
  Object.assign(homeStatsPanel.style, collapsed ? { left: 'calc(50% - 151px)' } : ORIG.home);
  Object.assign(awayStatsPanel.style, collapsed ? {} : ORIG.away);
  updateUI();
}

document.getElementById('toggleHomeStatsBtn').onclick =
document.getElementById('toggleAwayStatsBtn').onclick = togglePanels;

updateUI();

// Power bar display --------------------------------------------------------------------------------------------------------
const powerWrapper = document.createElement('div');
Object.assign(powerWrapper.style, {
  position: 'absolute',
  right: '50px',
  bottom: '20px',
  width: '40px',
  height: '180px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-end',
  fontFamily: 'Orbitron, sans-serif',
  textAlign: 'center',
  userSelect: 'none',
});

// Power percentage label ----------------------------------------------
const powerLabel = document.createElement('div');
Object.assign(powerLabel.style, {
  fontSize: '20px',
  marginBottom: '6px',
  color: '#fff',
  fontWeight: 'bold',
  textShadow: '0 0 6px rgba(255, 140, 0, 0.7), 0 0 12px rgba(255, 140, 0, 0.7)',
});

// Power bar ------------------------------------------------------------
const powerFrame = document.createElement('div');
Object.assign(powerFrame.style, {
  position: 'relative',
  width: '100%',
  height: '150px',
  background: '#222',
  border: '3px solid #FFA500',
  borderRadius: '12px',
  boxShadow: '0 0 20px rgba(255, 140, 0, 0.7)',
  overflow: 'hidden',
});

// Power bar fill -------------------------------------------------------
const powerFill = document.createElement('div');
Object.assign(powerFill.style, {
  position: 'absolute',
  left: 0,
  bottom: 0,
  width: '100%',
  height: '50%',
  background: '#ffeb3b',
  transition: 'height 0.1s',
});

powerFrame.appendChild(powerFill);
powerWrapper.appendChild(powerLabel);
powerWrapper.appendChild(powerFrame);
document.body.appendChild(powerWrapper);

// Function to calculate the color of the colorbar
function powerColor(p) {
  const g1 = { r:  76, g: 175, b:  80 };
  const g2 = { r: 255, g: 235, b:  59 };
  const g3 = { r: 244, g:  67, b:  54 };

  const t = p < 0.5 ? p * 2 : (p - 0.5) * 2;
  const c1 = p < 0.5 ? g1 : g2;
  const c2 = p < 0.5 ? g2 : g3;

  const r = Math.round(THREE.MathUtils.lerp(c1.r, c2.r, t));
  const g = Math.round(THREE.MathUtils.lerp(c1.g, c2.g, t));
  const b = Math.round(THREE.MathUtils.lerp(c1.b, c2.b, t));
  return `rgb(${r},${g},${b})`;
}

// Function to update the powerbar UI
function updatePower(dt) {
  if (keyState['KeyW']) shotPower += POWER_RATE * dt;
  if (keyState['KeyS']) shotPower -= POWER_RATE * dt;

  shotPower = THREE.MathUtils.clamp(shotPower, POWER_MIN, POWER_MAX);

  powerLabel.innerHTML = `${Math.round(shotPower * 100)}&nbsp;%`;
  powerFill.style.height = `${(shotPower * 100).toFixed(0)}%`;
  powerFill.style.background = powerColor(shotPower);
}

// Visual aid messages display --------------------------------------------------------------------------------------------
const popupMessage = document.createElement('div');
Object.assign(popupMessage.style, {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
  transform: 'translate(-50%, -50%) scale(1)',
  color: '#fff',
  fontSize: '64px',
  fontWeight: 'bold',
  fontFamily: 'Orbitron, sans-serif',
  textShadow: `
    0 0 10px rgba(255, 140, 0, 0.9),
    0 0 20px rgba(255, 140, 0, 0.8),
    0 0 40px rgba(255, 140, 0, 0.7)
  `,
  letterSpacing: '3px',
  zIndex: '100',
  display: 'none',
  textAlign: 'center',
});
document.body.appendChild(popupMessage);

// Ball movement keys ----------------------------------------------------------------------------------------------
const repeatableKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW','KeyS'];
// Map of repeatable keys to a bolean of whether or not they are currently being pressed down (true).
const keyState = Object.fromEntries(repeatableKeys.map(k => [k, false]));

// Key down events logic ------------------------------------------------------------------------------------------
function handleKeyDown(e) {
  const {code, repeat} = e;

  // Discrete actions
  if (!repeat){
    switch (code) {
    case 'KeyO':
      isOrbitEnabled = !isOrbitEnabled;
      break;
    case 'KeyC':
      currentPresetIndex = (currentPresetIndex + 1) % cameraPresets.length;
      applyCameraPreset(currentPresetIndex);
      break;
    case 'Space':
      if (!isBallInFlight && basketball.position.y === 2) shootBall();
      break;
    case 'KeyR':
      resetBall();
      break;
    }
  }

  // Movement actions (continous)
  if (code in keyState) keyState[code] = true;
}

document.addEventListener('keydown', handleKeyDown);

document.addEventListener('keyup', e => {
  if (e.code in keyState) keyState[e.code] = false;
});

// Make window adapt to resizing -------------------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Popup message function --------------------------------------------------------------------------------------------
function showPopupMessage(message, duration = 2000) {
  popupMessage.textContent = message;
  popupMessage.style.display = 'block';
  popupMessage.style.opacity = '1';
  popupMessage.style.transform = 'translate(-50%, -50%) scale(1)';

  setTimeout(() => {
    popupMessage.style.opacity = '0';
    popupMessage.style.transform = 'translate(-50%, -50%) scale(1.1)';
    setTimeout(() => {
      popupMessage.style.display = 'none';
    }, 600);
  }, duration);
}

// Function to handle resetting the ball -----------------------------------------------------------------------------
function resetBall() {
  basketball.position.set(0, 2, 0);
  basketball.userData.velocity.set(0, 0, 0);
  shotPower = 0.5;
  isBallInFlight = false;
  basketball.visible = true;
  if (!scored){
    if(target.equals(hoopLeft)){
      homeCombo = false;
      homeAccElement.textContent = Math.round(homeSuccessCounter/(homeShotCounter)*100);
    }
    else{
      awayCombo = false;
      awayAccElement.textContent = Math.round(awaySuccessCounter/(awayShotCounter)*100);
    }
  }
  scored = false;
}

// Ball movement with arrow keys -------------------------------------------------------------------------------------
function updateBall(dt) {
  const speed = 5; // units per second

  // Get camera directions
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0; // flatten to horizontal
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  const move = new THREE.Vector3();

  // Apply directional movement based on keys
  if (keyState['ArrowUp'])    move.add(forward);
  if (keyState['ArrowDown'])  move.sub(forward);
  if (keyState['ArrowRight']) move.add(right);
  if (keyState['ArrowLeft'])  move.sub(right);

  // Move the ball
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    basketball.position.add(move);
  }

  // Clamp inside court
  basketball.position.x = THREE.MathUtils.clamp(
    basketball.position.x, -courtBoundXRadius + BALL_RADIUS, courtBoundXRadius - BALL_RADIUS);
  basketball.position.z = THREE.MathUtils.clamp(
    basketball.position.z,  -courtBoundZRadius + BALL_RADIUS, courtBoundZRadius - BALL_RADIUS);
}

// Ball physics logic -------------------------------------------------------------------------------
function shootBall() {
  // Aim at the nearerst hoop
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir).setY(0).normalize();

  const camToLeft  = hoopLeft.clone().sub(camera.position).setY(0).normalize();
  const camToRight = hoopRight.clone().sub(camera.position).setY(0).normalize();

  if (camDir.dot(camToLeft) > camDir.dot(camToRight)){
    target = hoopLeft;
    homeShotCounter++;
    homeAttemptsElement.textContent = homeShotCounter;
  }
  else{
    target = hoopRight;
    awayShotCounter++;
    awayAttemptsElement.textContent = awayShotCounter;
  }
  // Distance and direction to hoop in XZ plane
  const dirXZ = target.clone().sub(basketball.position).setY(0);
  const distXZ = dirXZ.length();
  dirXZ.normalize();

  const MAX_DIST = 30; // furthest shot allowed in the court
  const t = THREE.MathUtils.clamp(distXZ / MAX_DIST, 0, 1); // 0 = right under rim, 1 = max range
  // When t = 0 (very close) more vertical, little horizontal
  // When t = 1 (very far) lots of horizontal, enough vertical to clear rim

  const horizMin = 1;
  const horizMax = 18;

  const vertMin  = 13;
  const vertMax  = 18;

  // Convert shotPower to speed
  const horizSpeed = THREE.MathUtils.lerp(horizMin, horizMax, shotPower * t);
  const vertSpeed  = THREE.MathUtils.lerp(vertMin,  vertMax,  shotPower * (1-t));

  // Apply velocity and shoot ball
  basketball.userData.velocity.copy(dirXZ.multiplyScalar(horizSpeed));
  basketball.userData.velocity.y = vertSpeed;
  isBallInFlight = true;
}

// Collision handling ------------------------------------------------------------------------------------------------

function backboardCollision(backboardCentre) {
  // Ball position relative to backboard center
  const rel = basketball.position.clone().sub(backboardCentre);

  // Compute the closest point on the backboard box
  const closest = new THREE.Vector3(
    THREE.MathUtils.clamp(rel.x, -backboardXRadius, backboardXRadius),
    THREE.MathUtils.clamp(rel.y, -backboardYRadius, backboardYRadius),
    THREE.MathUtils.clamp(rel.z, -backboardZRadius, backboardZRadius)
  );

  const diff = rel.clone().sub(closest); // from box to ball
  const distSq = diff.lengthSq();
  const r2 = BALL_RADIUS * BALL_RADIUS;

  if (distSq >= r2) return; // No collision

  // Normal pointing out from box surface to ball
  const dist = Math.sqrt(distSq) || 1e-8;
  const n = diff.clone().divideScalar(dist); // normalize

  // Reflect only if ball moving toward the board
  const v = basketball.userData.velocity;
  const vn = v.dot(n); // Velocity into board

  if (vn < -1e-4) {
    v.sub(n.multiplyScalar((1 + BACKBOARD_RESTITUTION) * vn)); // Reflect and dampen
    playSound(bounceSound);
  }
}

function poleCollision(poleCentre) {
  // Ball position relative to pole
  const rel = basketball.position.clone().sub(poleCentre);

  // If above or below the pole, no collision
  if (rel.y < -POLE_HALF_HEIGHT - BALL_RADIUS || rel.y > POLE_HALF_HEIGHT + BALL_RADIUS) return;

  // Horizontal distance to the pole axis
  const horiz2D = new THREE.Vector2(rel.x, rel.z);
  let horizLen = horiz2D.length();

  // Pick an arbitrary outward dir if we hit dead‑centre
  const dir = horizLen < 1e-6 ? new THREE.Vector2(1, 0) : horiz2D.clone().divideScalar(horizLen);

  const overlap = POLE_RADIUS + BALL_RADIUS - horizLen;
  if (overlap <= 0) return; // no collision

  // Collision normal (points outward from the pole)
  const n = new THREE.Vector3(dir.x, 0, dir.y);
  const v = basketball.userData.velocity;
  const vn = v.dot(n); // Velocity into pole

  // Bounce only if moving into pole
  if (vn < -1e-4) {
    v.sub(n.multiplyScalar((1 + POLE_RESTITUTION) * vn)); // reflect and dampen
    playSound(bounceSound);
  }
}

function netCollision(netCentre) {
  const rel = basketball.position.clone().sub(netCentre);
  const halfH = NET_HEIGHT * 0.5;
  if (rel.y < -halfH - BALL_RADIUS || rel.y > halfH + BALL_RADIUS) return;

  const horiz2D = new THREE.Vector2(rel.x, rel.z);
  let horizLen = horiz2D.length();

  const dir = horizLen < 1e-6 ? new THREE.Vector2(1, 0) : horiz2D.clone().divideScalar(horizLen);

  const t = (rel.y + halfH) / NET_HEIGHT;
  const radius = NET_BOTTOM_RADIUS + (NET_TOP_RADIUS - NET_BOTTOM_RADIUS) * t;

  const overlap = radius + BALL_RADIUS - horizLen;
  if (overlap <= 0) return; // no contact

  // nearest point on the net wall
  const onWallXZ = dir.clone().multiplyScalar(radius);
  const nearest  = new THREE.Vector3(
    onWallXZ.x + netCentre.x,
    THREE.MathUtils.clamp(basketball.position.y, netCentre.y - halfH, netCentre.y + halfH),
    onWallXZ.y + netCentre.z
  );

  // Collision normal
  const n = basketball.position.clone().sub(nearest).normalize();
  const v = basketball.userData.velocity;
  const vn = v.dot(n); // Velocity into net

  // Bounce only if the ball is moving into the wall
  if (vn < -1e-4) {
    v.sub(n.multiplyScalar((1 + NET_RESTITUTION) * vn)); // reflect and dampen
    if (t > 0.95) swish = false;
  }
  checkHoopScore(netCentre); // Check for successful shot
}

// Score detection --------------------------------------------------------------------------------------
let ballInNet = false;
let scored = false;
let homeCombo = false;
let awayCombo = false;
let swish = true;

function checkHoopScore(netCentre) {
  const relY = basketball.position.y - netCentre.y;
  const halfH = NET_HEIGHT * 0.5;

  // Check if ball is inside vertical bounds of net
  const inY = relY > -halfH && relY < halfH;

  // Check if ball is within horizontal radius at that height
  const t = (relY + halfH) / NET_HEIGHT;
  const radius = NET_BOTTOM_RADIUS + (NET_TOP_RADIUS - NET_BOTTOM_RADIUS) * t;
  const horizDist = new THREE.Vector2(
    basketball.position.x - netCentre.x,
    basketball.position.z - netCentre.z
  ).length();

  const inXZ = horizDist < radius;
  const inNet = inY && inXZ;

  // Transition detection
  if (inNet && !ballInNet) {
    // Just entered net area
    ballInNet = true;
  } else if (!inNet && ballInNet) {
    // Just exited net area
    if (relY < -halfH) {
      scored = true;
      let message = 'SCORE!';
      let points = 2;
      playSound(cheerSound);
      // Exited through bottom
      if (netCentre.x < 0){ // If left hoop
        if (swish){
          points = 4;
          message = 'SWISH!';
          playSound(swishSound);
        }
        else if (homeCombo){
          points = 3;
          message = 'COMBO ' + message;
          playSound(comboSound);
        }
        else{
          playSound(scoreSound);
        }
        homeScore = homeScore + points;
        homeSuccessCounter++;
        homeScoreElement.textContent = homeScore;
        homeSuccessElement.textContent = homeSuccessCounter;
        homeAccElement.textContent = Math.round(homeSuccessCounter/homeShotCounter*100);
        homeCombo = true;
        swish = true;
      }
      else{ // Right hoop
        if (swish){
          points = 4;
          message = 'SWISH!';
          playSound(swishSound);
        }
        else if (awayCombo){
          points = 3;
          message = 'COMBO ' + message;
          playSound(comboSound);
        }
        else{
          playSound(scoreSound);
        }
        awayScore = awayScore + points;
        awaySuccessCounter++;
        awayScoreElement.textContent = awayScore;
        awaySuccessElement.textContent = awaySuccessCounter;
        awayAccElement.textContent = Math.round(awaySuccessCounter/awayShotCounter*100);
        awayCombo = true;
        swish = true;
      }
      showPopupMessage(message);
    }
    ballInNet = false; // Reset flag
  }
}

// Handle miss ---------------------------------------------------------------------------------------------
function miss(){
  showPopupMessage('MISS!');
  playSound(booSound);
  playSound(missSound);
  if(target.equals(hoopLeft)){
    homeCombo = false;
    homeAccElement.textContent = Math.round(homeSuccessCounter/(homeShotCounter)*100);
  }
  else{
    awayCombo = false;
    awayAccElement.textContent = Math.round(awaySuccessCounter/(awayShotCounter)*100);
  }
}

// Physics integration
function stepPhysics(dt) {
  // Velocity
  basketball.userData.velocity.y += GRAVITY * dt;
  basketball.position.addScaledVector(basketball.userData.velocity, dt);

  // Check for hoop collisions on right and left hoops
  backboardCollision(leftBackboardCentre);
  backboardCollision(rightBackboardCentre);
  
  netCollision(leftNetCentre);
  netCollision(rightNetCentre);

  poleCollision(leftPoleCentre);
  poleCollision(rightPoleCentre);

  // Floor collision handling
  if (Math.abs(basketball.position.x) > courtXRadius || Math.abs(basketball.position.z) > courtZRadius){
    if (basketball.position.y < -1){
        basketball.visible = false;
        basketball.position.set(0, -2, 0);
        if (!scored) miss();
        isBallInFlight = false;
    }
  }
  else{
    if (basketball.position.y <= FLOOR_Y) {
      basketball.position.y = FLOOR_Y;
      if (Math.abs(basketball.userData.velocity.y) < MIN_BOUNCE){
        basketball.position.y = FLOOR_Y;
        basketball.userData.velocity.set(0, 0, 0);
        if (!scored) miss();
        isBallInFlight = false;
      }
      else{
        basketball.userData.velocity.y *= -RESTITUTION_GROUND;
        basketball.userData.velocity.x *= FRICTION_GROUND;
        basketball.userData.velocity.z *= FRICTION_GROUND;
        playSound(bounceSound);
      }
    }
  }
}

// Apply rotation to the ball
function updateBallRotation() {
  const currPos = basketball.position;
  const delta = currPos.clone().sub(basketball.userData.prevPos);
  const dist = delta.length();

  if (dist < 1e-6) {
    basketball.userData.prevPos.copy(currPos);
    return;
  }

  const grounded = !isBallInFlight || Math.abs(currPos.y - FLOOR_Y) < 1e-3;

  let axis, angle;

  if (grounded) {
    // Rolling: axis is perpendicular to motion
    axis  = new THREE.Vector3().crossVectors(delta, UP).normalize();
    angle = dist / BALL_RADIUS;
  } else {
    // Simulate backspin or sidespin
    axis  = new THREE.Vector3().crossVectors(delta, UP).normalize();
    angle = (dist / BALL_RADIUS) * 0.5;
  }

  // Smooth the rotation axis
  basketball.userData.axis.lerp(axis, 0.25).normalize();

  // Apply the rotation
  const q = new THREE.Quaternion().setFromAxisAngle(basketball.userData.axis, angle);
  basketball.quaternion.premultiply(q);

  basketball.userData.prevPos.copy(currPos);
}

// Trail function ---------------------------------------------------------------------------------------
function updateTrail() {
  if (!isBallInFlight) {
    // Clear trail if ball is not flying
    trailPoints.length = 0;
    trailGeometry.setFromPoints([]);
    return;
  }

  // Push current ball position (clone so it's not mutated)
  trailPoints.push(basketball.position.clone());

  // Remove oldest if too long
  if (trailPoints.length > maxTrailPoints) {
    trailPoints.shift();
  }

  trailGeometry.setFromPoints(trailPoints);
}


// Listener and flag that freeze the animation when the tab is hidden, and reset the timer when the tab reappears. This prevents large deltas and erratic physics.
let isVisible = true;
document.addEventListener('visibilitychange', () => {
  isVisible = !document.hidden;
  if (isVisible) {
    last = performance.now(); // Reset timer when returning
  }
});

// Animation function ---------------------------------------------------------------------------------------------------
let last = performance.now();
function animate(now = 0) {
  requestAnimationFrame(animate);
  if (!isVisible) return; // skip rendering/physics
  const dt = (now - last) / 1000; // seconds since last frame
  last = now;
  
  // Update ball
  if (!isBallInFlight && basketball.position.y === 2) updateBall(dt);  // allow ball movement when grounded
  updatePower(dt);
  if (isBallInFlight) {
    stepPhysics(dt);
  }
  updateBallRotation(dt);
  updateTrail();

  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();