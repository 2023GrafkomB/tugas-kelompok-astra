import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

//CONSTANTS
/* Max width for each level chunk (Renders max 3 inside camera at a time) */
const chunkX = 12
const chunkZ = 2

const scene = new THREE.Scene()

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
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
const player = new THREE.Mesh(geometry, material)
player.position.y=2
player.castShadow = true
scene.add(player)


// 2. Level Generation

let chunkGeo = new THREE.BoxGeometry(chunkX, 1, chunkZ)
let chunkMesh = new THREE.MeshStandardMaterial({ color: 0xffff00 })

let levelData = []
getData()
async function getData() {
    for (var i=0; i<4; i++) {

        levelData[i] = new THREE.Mesh( geometry, material );
        levelData[i].position.x = 10;
        levelData[i].receiveShadow = true

    }
}  

/* PLACEHOLDER FLOOR */
generateFloor()

// Sets up lighting
light()

/* SETUP PHYSICS */

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
})

// Sets up animating objects
let chunkCount = 0
let newObjPos
const smoothness = 0.1
scene.add(levelData[chunkCount])
function animate() {
  for (let i = 0; i <= chunkCount; i++){
    /* PHYSICS */
    world.fixedStep()

    /* OBJECT ANIMS */
    if (Math.abs(levelData[i].position.x) > chunkX){
      
    }
    newObjPos = levelData[i].position.clone()
    newObjPos.x -= 1
    levelData[i].position.lerp(newObjPos, smoothness);
  }

  console.log(Math.floor(levelData[chunkCount].position.x * 100) + '|' + cube.position.x)
  /* Using floor because otherwise position will skip 0 (super small fraction) */
  if (Math.floor(levelData[chunkCount].position.x * 100) == cube.position.x){
    
    scene.add(levelData[chunkCount])
  }
  if (chunkCount < 4){
    chunkCount++
    chunkCount = 0
  }
  

  requestAnimationFrame(animate)
  renderer.render(scene, camera)
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
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2;
  scene.add(floor);
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
