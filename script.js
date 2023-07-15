// Import required modules
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Get HTML elements
const canvas = document.querySelector('canvas.webgl');
const animationListContainer = document.getElementById('animation-list');
const fileInput = document.getElementById('file-input');

// Set up scene and camera
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(100, sizes.width / sizes.height);
camera.position.z = 2;
scene.add(camera);

// Set up loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Set up lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 5);
scene.add(light);

const spotLight = new THREE.SpotLight(0xffffffffff);
spotLight.position.set(-40, 60, -10);
scene.add(spotLight);

// Variables for animations and mixer
let gltfAnimations = [];
let mixer;

// Function to load GLB file
function loadGLB(file) {
  const reader = new FileReader();

  reader.addEventListener('load', (event) => {
    const gltfData = event.target.result;

    gltfLoader.parse(gltfData, '', (gltf) => {
      gltfAnimations = gltf.animations;
      scene.add(gltf.scene);

      mixer = new THREE.AnimationMixer(gltf.scene);

      sendFileData(file);

      displayAnimationList();
      playSequentialAnimations();
      
    });
  });

  reader.readAsArrayBuffer(file);
}

// Event listener for file input
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    loadGLB(file);
  }
});

// Function to send file data to the server
function sendFileData(file) {
    const formData = new FormData();
    formData.append('file', file);
  
    // Add the gltfAnimations data to the formData
    const animations = gltfAnimations.map(animation => animation.name);
    formData.append('animations', JSON.stringify(animations));
  
    fetch('https://deepvisionproject.onrender.com/upload', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('File upload successful:', data);
      })
      .catch((error) => {
        console.error('Error uploading file:', error);
      });
  }
  

// Function to play individual animation
function playAnimation(index, checked) {
  if (gltfAnimations && gltfAnimations.length > index && mixer) {
    const animation = gltfAnimations[index];

    mixer.stopAllAction();

    if (checked) {
      const action = mixer.clipAction(animation);
      action.clampWhenFinished = true;
      action.reset().play();
    }
  }
}

// Function to play animations sequentially
function playSequentialAnimations() {
  if (gltfAnimations.length > 0 && mixer) {
    let currentIndex = 0;

    const playNextAnimation = () => {
      const animationCheckbox = document.getElementById(`animation-${currentIndex}-checkbox`);
      if (animationCheckbox && animationCheckbox.checked) {
        const index = parseInt(animationCheckbox.dataset.index);
        playAnimation(index, true);

        setTimeout(() => {
          playAnimation(index, false);

          currentIndex++;
          if (currentIndex < gltfAnimations.length) {
            playNextAnimation();
          }
        }, 2000);
      }
    };

    playNextAnimation();
  }
}

// Event handler for sequential playback checkbox
function handleSequentialPlayback(event) {
  const checked = event.target.checked;
  const animationCheckboxes = document.querySelectorAll('.animation-checkbox');
  animationCheckboxes.forEach((checkbox, index) => {
    checkbox.checked = false;
    checkbox.disabled = checked;
  });

  if (checked) {
    playSequentialAnimations();
  } else {
    mixer.stopAllAction();
  }
}

// Event handler for all playback checkbox
function handleAllPlayback(event) {
  const checked = event.target.checked;
  const animationCheckboxes = document.querySelectorAll('.animation-checkbox');
  animationCheckboxes.forEach((checkbox, index) => {
    checkbox.checked = checked;
    checkbox.disabled = checked;
    playAnimation(index, checked);
  });
}

// Function to display animation list
function displayAnimationList() {
  if (animationListContainer && gltfAnimations.length > 0) {
    const checkboxesHTML = gltfAnimations
      .map((animation, index) => {
        return `<label for="animation-${index}-checkbox" style="color: aliceblue;">${animation.name}</label>
          <input type="checkbox" id="animation-${index}-checkbox" class="animation-checkbox" data-index="${index}"><br>`;
      })
      .join('');

    animationListContainer.innerHTML = checkboxesHTML;

    const animationCheckboxes = document.querySelectorAll('.animation-checkbox');
    animationCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        const index = parseInt(event.target.dataset.index);
        const checked = event.target.checked;
        playAnimation(index, checked);
      });
    });

    const sequentialCheckbox = document.getElementById('sequential-checkbox');
    sequentialCheckbox.addEventListener('change', handleSequentialPlayback);

    const allCheckbox = document.getElementById('all-checkbox');
    allCheckbox.addEventListener('change', handleAllPlayback);
  }
}

// Set up cursor position
const cursor = { x: 0, y: 0 };
window.addEventListener('mousemove', (event) => {
  cursor.x = event.clientX / sizes.width - 0.5;
  cursor.y = -(event.clientY / sizes.width - 0.5);
});

// Set up renderer and controls
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);

const controls = new OrbitControls(camera, canvas);

// Fullscreen event
window.addEventListener('dblclick', () => {
  if (!document.fullscreenElement) {
    canvas.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// Resize event
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation loop
const animate = () => {
  if (mixer) {
    mixer.update(0.016);
  }

  renderer.render(scene, camera);
  controls.update();
  window.requestAnimationFrame(animate);
};

animate();
