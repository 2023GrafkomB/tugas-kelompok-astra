import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//CONSTANTS (Declared first)
const scene = new THREE.Scene()
/* INIT PHYSICS */
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82 * 5, 0), // m/s²
  allowSleep: 1 // Disables physics for objects if they are below a certain speed ("sleepy")
})

/* GEOMETRIES & MATERIALS THAT ARE REUSED */
class Spike {
  static radius = 1.0;
  static height = 0.5;
  static radialSegments = 4;
  static geometry = new THREE.ConeGeometry(this.radius, this.height, this.radialSegments);
  static material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
}

class PlatformData {
  static placeholder =  new THREE.TextureLoader().load("./Textures/placeholder.png");
}

class PlayerData {
  static albedo =  new THREE.TextureLoader().load("./Textures/templategrid/TemplateGrid_albedo.png");
  static normal =  new THREE.TextureLoader().load("./Textures/templategrid/TemplateGrid_normal.png");
  static rough =  new THREE.TextureLoader().load("./Textures/templategrid/TemplateGrid_orm.png");
}
/**
 * Class to load GLTF
 */
class loadGLTF {
  constructor(){
    this.init()
  }

  async init(){
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('./geometry-dash-3d-kit/source/model.gltf');
    let mesh = gltf.scene.getObjectByName( 'DASH' );
    mesh.position.copy(new THREE.Vector3(25, 10, -50))
    console.log(mesh)
    mesh.scale.copy(new THREE.Vector3(100, 100, 100))
    mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.785398*4)
    scene.add(mesh)
  }
}

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
    this.INITPOS.y += 0.5

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
    const material = new THREE.MeshStandardMaterial({ 
      map: PlayerData.albedo,
      normalMap: PlayerData.normal,
      roughnessMap: PlayerData.rough,
      metalnessMap: PlayerData.normal 
    })
    const player = new THREE.Mesh(geometry, material)
    player.castShadow = true
    super(player, new CANNON.Vec3(size / 2, size / 2, size / 2), 0, initPos)
    this.objectBody.material = new CANNON.Material({ friction: 0, restitution: 0 }) // Prevent jittering when moving because restitution
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
    this.objectBody.velocity.x = 5 // Kecepatan dasar

    this.objectBody.position.z = 0

    this.objectBody.quaternion.x = 0
    this.objectBody.quaternion.y = 0
    //this.objectBody.quaternion.z = 0
    this.MESH.quaternion.copy(this.objectBody.quaternion)
  }

  updateControl() {
    if (this.spacebar_pressed && this.canJump) {
      this.objectBody.velocity.y = 0
      this.objectBody.applyImpulse(new CANNON.Vec3(0, 35, 0))
      this.spacebar_pressed = false
      this.canJump = false
      this.objectBody.angularVelocity = new CANNON.Vec3(0,0,0)
      this.objectBody.applyTorque(new CANNON.Vec3(0, 0, -100))
    }
  }

  respawnEvent() {
    this.objectBody.position.copy(this.INITPOS)
    this.objectBody.velocity = new CANNON.Vec3(0, 0, 0)
    console.log(this.objectBody.position)
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
    const size = Spike.height
    const truePosition = initPos
    truePosition.x += Spike.radius / 2
    const material = Spike.material
    const deathBox = new THREE.Mesh(Spike.geometry, material)
    deathBox.castShadow = true
    deathBox.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.785398) // So it's in the right angle
    super(deathBox, new CANNON.Vec3(size / 2, size / 2, size / 2), 1, truePosition)
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
   * - initPos : CANNON.Vec3, Initial Position of the Object starting for the leftmost point.
   * - playerBox : Reference to player's CANNON Body.
   * - @param {BigInt} length : Size in the x axis
   */
  constructor(initPos, playerBox, length) {
    const size = 1
    const truePosition = initPos
    truePosition.x += length / 2
    
    const geometry = new THREE.BoxGeometry(length, size, size)
    const material = new THREE.MeshStandardMaterial({ map: PlatformData.placeholder })
    const platform = new THREE.Mesh(geometry, material)
    super(platform, new CANNON.Vec3(length / 2, size / 2, size / 2), 1, truePosition)
    this.objectBody.material = new CANNON.Material({ friction: 0, restitution: 0 })
    this.setPLayerCollisionEvent(playerBox)
  }

  /**
 * Checks if the object collides with player by checking the world's collision matrix.
 * @param {class PlayerObject} player - Reference to player's instance
 */
  setPLayerCollisionEvent(player) {
    this.objectBody.addEventListener("collide", (e) => {

      if (world.collisionMatrix.get(player.objectBody, this.objectBody)) {
        if (player.objectBody.position.y - this.objectBody.position.y > 0.5) {
          player.canJump = true
        }
        else {
          console.log("kek")
          player.deathEvent()
        }
      }
    })
  }
}

/* START OF MAIN */
const loader = new THREE.TextureLoader();
const skyBox = loader.load(
  './Textures/test.jpg',
  () => {
    skyBox.mapping = THREE.EquirectangularReflectionMapping;
    skyBox.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyBox;
  });
// Sets up camera, renderer, & camera controls
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 10, 10);


const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
const cameraDirection = new THREE.Vector3();


// Sets up objects
// Player
const playerInitialPosition = new CANNON.Vec3(0, 2, 0)
let player = new PlayerObject(playerInitialPosition)

/**
 * GENERATE MAP START
 */
let singlePlat0_0 = new Platform(new CANNON.Vec3(14, 4, 0), player, 1)
let singlePlat1_0 = new Platform(new CANNON.Vec3(6, 3, 0), player, 1)
let fivePlat0_0 = new Platform(new CANNON.Vec3(9, 3, 0), player, 5)
let singlePlat2_0 = new Platform(new CANNON.Vec3(5, 2, 0), player, 1)
let deathBox0_0 = new DeathBox(new CANNON.Vec3(7, 3, 0), player)
let deathBox0_1 = new DeathBox(new CANNON.Vec3(7.9, 3, 0), player)
let fivePlat1_0 = new Platform(new CANNON.Vec3(0, 1, 0), player, 5)
let singlePlat0_1 = new Platform(new CANNON.Vec3(15, 4, 0), player, 1)
let singlePlat1_1 = new Platform(new CANNON.Vec3(16, 4, 0), player, 1)
let fivePlat0_1 = new Platform(new CANNON.Vec3(17, 3, 0), player, 5)
let deathBox0_2 = new DeathBox(new CANNON.Vec3(22, 3, 0), player)
let deathBox0_3 = new DeathBox(new CANNON.Vec3(22.9, 3, 0), player)
let singlePlat0_2 = new Platform(new CANNON.Vec3(24, 3, 0), player, 1)
let singlePlat0_10 = new Platform(new CANNON.Vec3(25, 3, 0), player, 1)
let singlePlat0_3 = new Platform(new CANNON.Vec3(26, 3, 0), player, 1)
let singlePlat0_4 = new Platform(new CANNON.Vec3(27, 4, 0), player, 1)
let singlePlat0_5 = new Platform(new CANNON.Vec3(28, 5, 0), player, 1)
let singlePlat0_6 = new Platform(new CANNON.Vec3(29, 5, 0), player, 1)
let singlePlat0_7 = new Platform(new CANNON.Vec3(30, 6, 0), player, 1)
let singlePlat0_8 = new Platform(new CANNON.Vec3(31, 6, 0), player, 1)
let deathBox0_4 = new DeathBox(new CANNON.Vec3(32, 6, 0), player)
let deathBox1_2 = new DeathBox(new CANNON.Vec3(32.9, 6, 0), player)
let singlePlat0_9 = new Platform(new CANNON.Vec3(34, 6, 0), player, 1)
let fivePlat0_2 = new Platform(new CANNON.Vec3(35, 5, 0), player, 5)
let singlePlat0_11 = new Platform(new CANNON.Vec3(40, 6, 0), player, 1)
let singlePlat0_12 = new Platform(new CANNON.Vec3(41, 6, 0), player, 1)
let singlePlat0_13 = new Platform(new CANNON.Vec3(42, 7, 0), player, 1)
let singlePlat0_14 = new Platform(new CANNON.Vec3(43, 7, 0), player, 1)
let fivePlat0_3 = new Platform(new CANNON.Vec3(44, 6, 0), player, 5)
let singlePlat0_22 = new Platform(new CANNON.Vec3(49, 7, 0), player, 1)
let singlePlat0_21 = new Platform(new CANNON.Vec3(50, 7, 0), player, 1)
let singlePlat0_23 = new Platform(new CANNON.Vec3(51, 7, 0), player, 1)
let deathBox0_8 = new DeathBox(new CANNON.Vec3(52, 7, 0), player)
let deathBox1_9 = new DeathBox(new CANNON.Vec3(52.9, 7, 0), player)
let singlePlat0_25 = new Platform(new CANNON.Vec3(54, 7, 0), player, 1)
let singlePlat0_26 = new Platform(new CANNON.Vec3(55, 7, 0), player, 1)
let fivePlat0_4 = new Platform(new CANNON.Vec3(56, 8, 0), player, 5)
let singlePlat0_27 = new Platform(new CANNON.Vec3(57, 8, 0), player, 1)
let singlePlat0_28 = new Platform(new CANNON.Vec3(58, 8, 0), player, 1)
let singlePlat0_29 = new Platform(new CANNON.Vec3(59, 8, 0), player, 1)
let singlePlat0_30 = new Platform(new CANNON.Vec3(60, 8, 0), player, 1)
let deathBox0_7 = new DeathBox(new CANNON.Vec3(61, 8, 0), player)
let singlePlat0_24 = new Platform(new CANNON.Vec3(62, 8, 0), player, 1)
let singlePlat0_31 = new Platform(new CANNON.Vec3(63, 8, 0), player, 1)
let singlePlat0_32 = new Platform(new CANNON.Vec3(64, 9, 0), player, 1)
let singlePlat0_33 = new Platform(new CANNON.Vec3(65, 9, 0), player, 1)
let singlePlat0_34 = new Platform(new CANNON.Vec3(66, 9, 0), player, 1)
let singlePlat0_35 = new Platform(new CANNON.Vec3(67, 8, 0), player, 1)
let singlePlat0_36 = new Platform(new CANNON.Vec3(68, 8, 0), player, 1)
let singlePlat0_37 = new Platform(new CANNON.Vec3(69, 8, 0), player, 1)
let singlePlat0_38 = new Platform(new CANNON.Vec3(70, 7, 0), player, 1)
let singlePlat0_39 = new Platform(new CANNON.Vec3(71, 7, 0), player, 1)
let singlePlat0_40 = new Platform(new CANNON.Vec3(72, 6, 0), player, 1)
let singlePlat0_41 = new Platform(new CANNON.Vec3(73, 6, 0), player, 1)
let singlePlat0_42 = new Platform(new CANNON.Vec3(74, 6, 0), player, 1)
let singlePlat0_43 = new Platform(new CANNON.Vec3(75, 5, 0), player, 1)
let singlePlat0_44 = new Platform(new CANNON.Vec3(76, 5, 0), player, 1)
let singlePlat0_45 = new Platform(new CANNON.Vec3(77, 5, 0), player, 1)
let singlePlat0_46 = new Platform(new CANNON.Vec3(78, 4, 0), player, 1)
let singlePlat0_47 = new Platform(new CANNON.Vec3(79, 4, 0), player, 1)
let singlePlat0_48 = new Platform(new CANNON.Vec3(86, 3, 0), player, 1)
let singlePlat0_49 = new Platform(new CANNON.Vec3(85, 3, 0), player, 1)
let fivePlat0_5 = new Platform(new CANNON.Vec3(80, 3, 0), player, 5)
let singlePlat0_63 = new Platform(new CANNON.Vec3(87, 3, 0), player, 1)
let singlePlat0_50 = new Platform(new CANNON.Vec3(88, 4, 0), player, 1)
let singlePlat0_51 = new Platform(new CANNON.Vec3(89, 4, 0), player, 1)
let singlePlat0_52 = new Platform(new CANNON.Vec3(90, 3, 0), player, 1)
let singlePlat0_53 = new Platform(new CANNON.Vec3(91, 3, 0), player, 1)
let singlePlat0_54 = new Platform(new CANNON.Vec3(92, 4, 0), player, 1)
let singlePlat0_55 = new Platform(new CANNON.Vec3(93, 4, 0), player, 1)
let singlePlat0_56 = new Platform(new CANNON.Vec3(94, 5, 0), player, 1)
let singlePlat0_57 = new Platform(new CANNON.Vec3(95, 5, 0), player, 1)
let deathBox0_10 = new DeathBox(new CANNON.Vec3(96, 5, 0), player)
let deathBox0_11 = new DeathBox(new CANNON.Vec3(96.9, 5, 0), player)
let singlePlat0_58 = new Platform(new CANNON.Vec3(97, 5, 0), player, 1)
let singlePlat0_59 = new Platform(new CANNON.Vec3(98, 5, 0), player, 1)
let singlePlat0_60 = new Platform(new CANNON.Vec3(99, 6, 0), player, 1)
let singlePlat0_61 = new Platform(new CANNON.Vec3(100, 6, 0), player, 1)
let singlePlat0_62 = new Platform(new CANNON.Vec3(101, 6, 0), player, 1)

/**
 * GENERATE MAP END
 */

/* DEATH FLOOR */
generateFloor(player)

// Sets up effects
light()
shadow()
let model3D = new loadGLTF()
// Setup other app controls
setupAppControls()

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
  cameraDirection.subVectors(camera.position, controls.target);
  cameraDirection.normalize().multiplyScalar(15);
  camera.position.copy(cameraDirection.add(controls.target));
}
animate()


/* Functions */

/**
 * Generates death hitbox that covers the bottom of the level.
 * player - Reference to player object
 */
function generateFloor(player) {
  // TEXTURES

  var WIDTH = 80;
  var LENGTH = 80;
  var geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
  var material = new THREE.MeshStandardMaterial({transparent: true, opacity: 0.0});
  var floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;

  /* GENERATE CANNON HITBOX */
  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),

  })
  groundBody.material = new CANNON.Material({ friction: 0, restitution: 0 }) // Prevent jittering when moving because restitution

  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // make it face up

  groundBody.position.x += WIDTH / 2
  groundBody.position.y -= 10
  floor.position.copy(groundBody.position)
  floor.quaternion.copy(groundBody.quaternion)
  scene.add(floor);
  world.addBody(groundBody)

  // Kills player when it touches
  groundBody.addEventListener("collide", (e) => {

    if (world.collisionMatrix.get(player.objectBody, groundBody)) {
      console.log("YOU ARE DED")
      player.deathEvent()
    }
  })

  return groundBody
}
function wrapAndRepeatTexture(map, repeat) {
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.x = repeat;
}
function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  var dirLight = new THREE.DirectionalLight(0xeb348c, 2);
  dirLight.position.set(0, 10, 40);
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
  var dirLight2 = new THREE.DirectionalLight(0xf0d9ff, 2);
  dirLight2.position.set(0, 10, -40);
  dirLight2.castShadow = true;
  dirLight2.shadow.camera.top = 50;
  dirLight2.shadow.camera.bottom = -50;
  dirLight2.shadow.camera.left = -50;
  dirLight2.shadow.camera.right = 50;
  dirLight2.shadow.camera.near = 0.1;
  dirLight2.shadow.camera.far = 200;
  dirLight2.shadow.mapSize.width = 4096;
  dirLight2.shadow.mapSize.height = 4096;
  scene.add(dirLight2);
  // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}

function shadow() {
  {
    const color = 0xffbfed;
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
