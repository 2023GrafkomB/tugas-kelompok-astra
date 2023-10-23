import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

//CONSTANTS (Declared first)
const scene = new THREE.Scene()
/* INIT PHYSICS */
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82*5, 0), // m/s²
  allowSleep: 1 // Disables physics for objects if they are below a certain speed ("sleepy")
})

/**
 * Class for ThreeJs objects using a box body.
 * Parameter :
 * - Mesh : ThreeJs mesh, represents the object.
 * - halfExtents : CANNON.Vec3, represents HALF of the object's size.
 * - BodyType : True if the object doesn't move.
 * - initPos : CANNON.Vec3, Initial Position of the Object.
 */
class ActiveObject {
  constructor(Mesh, halfExtents, isStatic, initPos) {
    this.INITPOS = initPos
    this.MESH = Mesh
    this.HALF_EXTENTS = halfExtents

    // Setup initial position
    this.objectShape = new CANNON.Box(this.HALF_EXTENTS)
    this.objectBody
    if (isStatic == 1) {
      this.objectBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: this.objectShape })
    }
    else {
      this.objectBody = new CANNON.Body({ mass: 2, shape: this.objectShape })
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
    this.objectBody.material = new CANNON.Material({friction: 0, restitution: 0}) // Prevent jittering when moving because restitution
    console.log(this.objectBody.material)
    // Player controls
    this.spacebar_pressed = false
    this.setControl()

    // Player status
    this.isDead = false
    this.canJump = true

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
    this.objectBody.velocity.x = 4 // Kecepatan dasar
    
    this.objectBody.position.z = 0

    this.objectBody.quaternion.x = 0
    this.objectBody.quaternion.y = 0
    this.objectBody.quaternion.z = 0
  }

  updateControl() {
    if (this.spacebar_pressed && this.canJump) {
      this.objectBody.velocity.y = 0
      this.objectBody.applyImpulse(new CANNON.Vec3(0, 35, 0))
      this.spacebar_pressed = false
      this.canJump = false
    }
  }

  respawnEvent() {
    this.objectBody.position.copy(this.INITPOS)
    scene.add(this.MESH)
    world.addBody(this.objectBody)
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

class Platform extends ActiveObject {
  /**
   * Class for platform, collision with player on it's sides results in death.
   * Parameter :
   * - initPos : CANNON.Vec3, Initial Position of the Object.
   * - playerBox : Reference to player's CANNON Body.
   * - @param {BigInt} length : Size in the x axis
   */
  constructor(initPos, playerBox, length) {
    const size = 1
    const truePosition = initPos
    truePosition.x += 5
    truePosition.y += 0.5
    const geometry = new THREE.BoxGeometry(length, size, size)
    const material = new THREE.MeshStandardMaterial({ color: 0x00ffff })
    const deathBox = new THREE.Mesh(geometry, material)
    super(deathBox, new CANNON.Vec3(length / 2, size / 2, size / 2), 1, initPos)
    this.objectBody.material = new CANNON.Material({friction: 0, restitution: 0})

    this.setPLayerCollisionEvent(playerBox)
  }

    /**
   * Checks if the object collides with player by checking the world's collision matrix.
   * @param {class PlayerObject} player - Reference to player's instance
   */
    setPLayerCollisionEvent(player) {
      this.objectBody.addEventListener("collide", (e) => {
        
        if (world.collisionMatrix.get(player.objectBody, this.objectBody)) {
          console.log("ON A PLATFORM")
          player.canJump = true
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
camera.position.set( 0, 10, 10 );


const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
const cameraDirection = new THREE.Vector3();


// Sets up objects
// 1. Player
const playerInitialPosition = new CANNON.Vec3(0, 0, 0)
let player = new PlayerObject(playerInitialPosition)
let test = new Platform(playerInitialPosition, player, 5)

/* PLACEHOLDER FLOOR */
generateFloor()

// Sets up lighting
light()


// let testBox = []
// for (let i = 0; i < 5; i++){
//   testBox[i] = new DeathBox(new CANNON.Vec3((i+1)*5, 1, 0), player)
// }

// Setup other app controls
setupAppControls()

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  /* PHYSICS */
  world.fixedStep()

  /* OBJECT ANIMS + PHYSICS */
  player.updatePosition()
  test.updatePosition()
  /* CAMERA FOLLOW PLAYER */
  controls.target = player.MESH.position
  controls.update()
  cameraDirection.subVectors(camera.position, controls.target);
  // cameraDirection.normalize().multiplyScalar(20);
  camera.position.copy(cameraDirection.add(controls.target));
  debug(player.objectBody.sleepState)
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
  groundBody.material = new CANNON.Material({friction: 0, restitution: 0}) // Prevent jittering when moving because restitution

  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // make it face up
  floor.position.copy(groundBody.position)
  floor.quaternion.copy(groundBody.quaternion)
  scene.add(floor);
  world.addBody(groundBody)
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

/**
 * Sets up application controls other than gameplay.
 * 
 */
function setupAppControls() {
  document.addEventListener("keyup", (e) => {
    if (e.key == 'r') {
      player.respawnEvent()
    };
  })
}