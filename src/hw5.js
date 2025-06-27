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

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

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

    const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 8, 32);
    const pole = makeMesh(poleGeometry, blackMetalMaterial, {x: 0.5, y: 4});
    hoop.add(pole);

    const baseGeometry = new THREE.BoxGeometry(1.7, 0.2, 1.4);
    const base = makeMesh(baseGeometry, blackMetalMaterial, {x: 0.2, y: 0.1});
    hoop.add(base);

    const diagArmGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 32);
    const diagArm = makeMesh(diagArmGeometry, blackMetalMaterial, {x: 1.3, y: 7.37, rz: 2*Math.PI/3});
    hoop.add(diagArm);

    const armGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 32);
    const arm = makeMesh(armGeometry, blackMetalMaterial, {x: 1.3, y: 7.7, rz: Math.PI/2});
    hoop.add(arm);

    const poleWeldGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.4);
    const poleWeld = makeMesh(poleWeldGeometry, blackMetalMaterial, {x: 1.92, y: 7.7});
    hoop.add(poleWeld);

    const backboardGeometry = new THREE.BoxGeometry(0.2, 2.5, 3);
    const backboard =  makeMesh(backboardGeometry, glassMaterial, {x: 2.12, y: 8.68});
    hoop.add(backboard);

    const backboardBorder = makeBorder(3, 2.5, 0.2, 0.02, courtMarkingsMaterial, {castShadow: true});
    backboardBorder.rotateY(Math.PI/2);
    backboardBorder.position.set(2.12, 8.68, 0);

    hoop.add(backboardBorder);

    const backboardInnerBox = mirror(backboardBorder, {y: 8.56});
    backboardInnerBox.scale.set(0.5, 0.5, 1);
    hoop.add(backboardInnerBox);

    hoop.scale.set(1.2, 1.2, 1.2);

    const hoopRingGeometry = new THREE.TorusGeometry(0.9, 0.09, 32, 100);
    const hoopRing = makeMesh(hoopRingGeometry, orangeMetalMaterial, {x: 3.5, y: 7.88, rx: -Math.PI / 2});
    hoop.add(hoopRing);

    const hoopBaseGeometry = new THREE.BoxGeometry(0.04, 0.4, 0.4);
    const hoopBaseVert = makeMesh(hoopBaseGeometry, orangeMetalMaterial, {x: 2.24, y: 7.7});
    hoop.add(hoopBaseVert);

    const hoopBaseHorz = mirror(hoopBaseVert, {x: 2.42, y: 7.88});
    hoopBaseHorz.rotateZ(-Math.PI / 2);
    hoop.add(hoopBaseHorz);

    const netGeometry = new THREE.CylinderGeometry(0.9, 0.6, 1.3, 32, 1, true);
    const net = makeMesh(netGeometry, netMaterial, {x: 3.5, y: 7.3, castShadow: false});
    hoop.add(net);

    if (flip) hoop.rotateY(Math.PI);
    hoop.position.x = x;
    return hoop;
  }
  
  // COURT FLOOR -----------------------------------------------------------------------------------------------------------------
  const courtGeometry = new THREE.BoxGeometry(34, 0.2, 17);
  courtGeometry.setAttribute('uv2', courtGeometry.attributes.uv);
  const court = makeMesh(courtGeometry, woodMaterial, {castShadow: false});
  scene.add(court);
  
  // BASKETBALL -----------------------------------------------------------------------------------------------------------------
  const basketballGeometry = new THREE.SphereGeometry(0.5, 64, 64);
  const basketball = makeMesh(basketballGeometry, basketballMaterial, {y: 2, rx: Math.PI/2});
  scene.add(basketball);
  
  // COURT MARKINGS --------------------------------------------------------------------------------------------------------------
  // Thickness for court markings
  const markingsThickness = 0.1
  const courtMarkings = new THREE.Group();
  
  // Center line ----------------------------
  const centerLineGeometry = new THREE.BoxGeometry(markingsThickness, 0.01, 14);
  const centerLine = makeMesh(centerLineGeometry, courtMarkingsMaterial, {castShadow: false});

  // Court border ----------------------------
  const courtBorder = makeBorder(29, 14, 0.01, markingsThickness, courtMarkingsMaterial);
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

  // Hoops---------------------------------------------------------------------------------------------------
  const leftHoop = makeHoop(-16);
  scene.add(leftHoop);

  const rightHoop = makeHoop(16, true);
  scene.add(rightHoop);
}

// Create all elements
createBasketballCourt();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();

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


// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Initially set camera preset to default view
let currentPresetIndex = 0;

// Function to encapsulate camera preset switching on key press
function applyCameraPreset(index) {
  const preset = cameraPresets[index];
  camera.position.copy(preset.position);
  camera.lookAt(preset.lookAt);
  controls.target.copy(preset.lookAt);
  controls.update();
}

// Sets preset to default view
applyCameraPreset(0);

// Instructions display
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
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
  <p>C - Switch between camera presets</p>
`;
document.body.appendChild(instructionsElement);

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



// Handle key events
function handleKeyDown(e) {
  switch (e.key.toLowerCase()) {
    case 'o':
      isOrbitEnabled = !isOrbitEnabled;
      break;
    case 'c':
      currentPresetIndex = (currentPresetIndex + 1) % cameraPresets.length;
      applyCameraPreset(currentPresetIndex);
      break;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();