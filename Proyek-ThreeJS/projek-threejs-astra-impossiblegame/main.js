import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

//CONSTANTS (Declared first)
const scene = new THREE.Scene()
/* INIT PHYSICS */

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82*5, 0), // m/s²
})

/**
 * Class for ThreeJs objects using a box body.
 * Parameter :
 * - Mesh : ThreeJs mesh, represents the object.
 * - halfExtents : CANNON.Vec3, represents HALF of the object's size.
 * - isStatic : True if the object doesn't move.
 * - initPos : CANNON.Vec3, Initial Position of the Object.
 */
class ActiveObject {
  constructor(Mesh, halfExtents, isStatic, initPos) {
    this.MESH = Mesh
    this.HALF_EXTENTS = halfExtents

    // Setup initial position
    this.objectShape = new CANNON.Box(this.HALF_EXTENTS)
    this.objectBody = new CANNON.Body({ mass: 2, shape: this.objectShape })
    if (isStatic) {
      this.objectBody.type = CANNON.Body.STATIC
    }
    else {
      this.objectBody.type = CANNON.Body.DYNAMIC
    }
    this.MESH.position.copy(initPos)
    this.objectBody.position.copy(initPos)
    scene.add(Mesh)
    world.addBody(this.objectBody)
  }

  /**
   * Updates object position (called in animate() function) or changes it based on "Pos".
   * @param {CANNON.Vec3|THREE.Vector3} [Pos=undefined] Pos - Where the object is moved
   */
  updatePosition(Pos) {
    let nextPosition
    if (Pos === undefined) {
      nextPosition = this.objectBody.position
    }
    else {
      nextPosition = Pos
    }
    this.MESH.position.copy(nextPosition)
    this.objectBody.position.copy(nextPosition)
    this.MESH.quaternion.copy(this.objectBody.quaternion)
  }

}

class PlayerObject extends ActiveObject {
  constructor(initPos) {
    const size = 1
    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshStandardMaterial({ color: 0xffff00 })
    const player = new THREE.Mesh(geometry, material)
    player.castShadow = true
    super(player, new CANNON.Vec3(size / 2, size / 2, size / 2), 0, initPos)

    // Player controls
    this.spacebar_pressed = false
    this.setControl()

    // Player status
    this.isDead = false

  }
  
  setControl() {
    // CONTROLS

    document.addEventListener("keydown", (e) => {
      if (e.key == ' ') {
        e.preventDefault();
        this.spacebar_pressed = true;
        this.updateControl()
        console.log("JUMP");
      };
    })
    document.addEventListener("keyup", (e) => {
      if (e.key == ' ') {
        this.spacebar_pressed = false;
      };
    })
  }

  updatePosition(Pos) {
    super.updatePosition(Pos)
    // MOVEMENT
    this.objectBody.velocity.x = 5 // Kecepatan dasar
    
    this.objectBody.position.z = 0

    this.objectBody.quaternion.x = 0
    this.objectBody.quaternion.y = 0
    this.objectBody.quaternion.z = 0
  }

  updateControl() {
    if (this.spacebar_pressed && this.objectBody.position.y < 1) {
      this.objectBody.velocity.y = 0
      this.objectBody.applyImpulse(new CANNON.Vec3(0, 35, 0))
      this.spacebar_pressed = false
    }
  }

  deathEvent() {
    scene.remove(this.MESH)
    world.removeBody(this.objectBody)
  }
}

class DeathBox extends ActiveObject {
  /**
   * Class for Death Hitbox, collision with player results in player's death.
   * Parameter :
   * - initPos : CANNON.Vec3, Initial Position of the Object.
   * - playerBox : Reference to player's CANNON Body.
   */
  constructor(initPos, playerBox) {
    const size = 1
    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    const deathBox = new THREE.Mesh(geometry, material)
    super(deathBox, new CANNON.Vec3(size / 2, size / 2, size / 2), 0, initPos)
    this.setPLayerCollisionEvent(playerBox)
  }
  /**
   * Checks if the object collides with player by checking the world's collision matrix.
   * @param {class PlayerObject} player - Reference to player's instance
   */
  setPLayerCollisionEvent(player) {
    this.objectBody.addEventListener("collide", (e) => {
      
      if (world.collisionMatrix.get(player.objectBody, this.objectBody)) {
        console.log("YOU ARE DED")
        player.deathEvent()
      }
    })
  }
  
}



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
let player = new PlayerObject(new CANNON.Vec3(0, 0, 0))
/* PLAYER PHYSICS */




// 2. Level Generation


/* PLACEHOLDER FLOOR */
generateFloor()

// Sets up lighting
light()


let testBox = []
for (let i = 0; i < 5; i++){
  testBox[i] = new DeathBox(new CANNON.Vec3((i+1)*5, 1, 0), player)
}

// Timer for updating animation
const direction = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  /* PHYSICS */
  world.fixedStep()

  /* OBJECT ANIMS + PHYSICS */
  player.updatePosition()
  /* CAMERA FOLLOW PLAYER */
  controls.target = player.MESH.position
  controls.update()
  direction.subVectors(camera.position, controls.target);
  direction.normalize().multiplyScalar(20);
  camera.position.copy(direction.add(controls.target));

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
  return groundBody
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