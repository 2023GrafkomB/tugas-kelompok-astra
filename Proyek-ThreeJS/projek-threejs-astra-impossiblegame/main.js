import * as THREE from 'three'
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
const cube = new THREE.Mesh(geometry, material)
cube.position.y=2
cube.castShadow = true
scene.add(cube)


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


// Sets up lighting
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.y = 3
light.position.z = 1
light.castShadow = true
scene.add(light)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))

// Sets up animating objects
let chunkCount = 0
let newObjPos
const smoothness = 0.1
scene.add(levelData[chunkCount])
function animate() {
  for (let i = 0; i <= chunkCount; i++){
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