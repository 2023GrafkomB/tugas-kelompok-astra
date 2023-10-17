import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

//CONSTANTS
/* Max width for each level chunk (Renders max 3 inside camera at a time) */
const chunkX = 12
const chunkZ = 2

const scene = new THREE.Scene()
/* INIT PHYSICS */

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
})

// Sets up camera, renderer, & camera controls
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
camera.position.y = 3
camera.position.z = 5

// Sets up objects
// 1. Player
const size = 1
const initPos = new CANNON.Vec3(0, 0, 0)
const geometry = new THREE.BoxGeometry(size, size, size)
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
const player = new THREE.Mesh(geometry, material)
player.castShadow = true
scene.add(player)
/* PLAYER PHYSICS */
const halfExtents = new CANNON.Vec3(size / 2, size / 2, size / 2)
const playerShape = new CANNON.Box(halfExtents)
const playerBody = new CANNON.Body({ mass: 2, shape: playerShape })
playerBody.position = initPos

// CONTROLS
var spacebar_pressed = false;
document.addEventListener("keydown", function(e) {
  if (e.key == ' ') {
      e.preventDefault();
      spacebar_pressed = true;
      console.log("JUMP");
  };
})
document.addEventListener("keyup", function(e) {
  if (e.key == ' ') {
      spacebar_pressed = false;
  };
})


world.addBody(playerBody)
// 2. Level Generation


/* PLACEHOLDER FLOOR */
generateFloor()

// Sets up lighting
light()

// Timer for updating animation
const direction = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  /* PHYSICS */
  world.fixedStep()

  /* OBJECT ANIMS + PHYSICS */
  // Player

  playerBody.velocity.x = 3
  if(spacebar_pressed) {
    
    playerBody.applyImpulse(new CANNON.Vec3(0, 1, 0))
  }
  player.position.copy(playerBody.position)
  player.quaternion.copy(playerBody.quaternion)
  controls.target = player.position
  controls.update()
  /* CAMERA FOLLOW PLAYER */
  direction.subVectors( camera.position, controls.target );
  direction.normalize().multiplyScalar( 20 );
  camera.position.copy( direction.add( controls.target ) );

}
animate()


/* Functions */

function generateFloor() {
  // TEXTURES
  var textureLoader = new THREE.TextureLoader();
  var placeholder = textureLoader.load("./Textures/placeholder.png");
  var WIDTH = 80;
  var LENGTH = 80;
  var geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
  var material = new THREE.MeshStandardMaterial({
    map: placeholder
  });
  wrapAndRepeatTexture(material.map);
  // const material = new THREE.MeshPhongMaterial({ map: placeholder})
  var floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;

  /* GENERATE CANNON HITBOX */
  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
  })
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // make it face up
  floor.position.copy(groundBody.position)
  floor.quaternion.copy(groundBody.quaternion)
  scene.add(floor);
  world.addBody(groundBody)
  console.log(floor.position)
}
function wrapAndRepeatTexture(map) {
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.x = map.repeat.y = 10;
}
function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  var dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(60, 100, 20);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
  // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}

function shadow() {
  {
    const color = 0x000c29;
    const near = 5;
    const far = 50;
    scene.fog = new THREE.Fog(color, near, far);
  }
}

function debug(print) {
  console.log(print)
}