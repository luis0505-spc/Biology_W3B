// Variables globales para Three.js
let scene, camera, renderer, controls;
const R = 5; // Radio de la Tierra

// Inicialización de la escena, cámara y renderizador
function initEarth() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("earth-container").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  window.addEventListener("resize", onWindowResize, false);
}

// Creación de la Tierra con textura e iluminación
function createEarth() {
  const textureLoader = new THREE.TextureLoader();
  const earthTexture = textureLoader.load("earth/textures/earth.jpg"); // Verifica la ruta

  const geometry = new THREE.SphereGeometry(R, 64, 64);
  const material = new THREE.MeshPhongMaterial({ map: earthTexture });
  const earthMesh = new THREE.Mesh(geometry, material);
  // Deshabilitamos el raycasting en la malla de la Tierra para evitar interferencias
  earthMesh.raycast = function () {};
  scene.add(earthMesh);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);
}

// Carga y visualización de fronteras (regiones) desde el archivo externo countries.geojson
function loadCountries() {
  fetch("earth/countries.geojson")
    .then((response) => response.json())
    .then((data) => {
      data.features.forEach((region) => {
        if (region.geometry.type === "Polygon") {
          // Procesamos polígonos
          const coords = region.geometry.coordinates[0];
          const points = [];
          coords.forEach(([lon, lat]) => {
            // Conversión de coordenadas geográficas a 3D sobre la superficie de la esfera
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            const x = -(R + 0.02) * Math.sin(phi) * Math.cos(theta);
            const y = (R + 0.02) * Math.cos(phi);
            const z = (R + 0.02) * Math.sin(phi) * Math.sin(theta);
            points.push(new THREE.Vector3(x, y, z));
          });
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
          const borderLine = new THREE.LineLoop(geometry, material);
          // Se guardan las propiedades del objeto (nombre, ciudades, ecosistemas, fauna y flora)
          borderLine.userData = region.properties;
          scene.add(borderLine);
        } else if (region.geometry.type === "Point") {
          // Procesamos puntos
          const [lon, lat] = region.geometry.coordinates;
          const phi = (90 - lat) * (Math.PI / 180);
          const theta = (lon + 180) * (Math.PI / 180);
          const x = -(R + 0.02) * Math.sin(phi) * Math.cos(theta);
          const y = (R + 0.02) * Math.cos(phi);
          const z = (R + 0.02) * Math.sin(phi) * Math.sin(theta);
          // Creamos un marcador (por ejemplo, una esfera pequeña)
          const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
          const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
          });
          const marker = new THREE.Mesh(markerGeometry, markerMaterial);
          marker.position.set(x, y, z);
          // Asignamos las propiedades del GeoJSON al marcador
          marker.userData = region.properties;
          scene.add(marker);
        }
      });
    })
    .catch((error) =>
      console.error("Error al cargar countries.geojson:", error)
    );
}

// Configuración del raycaster para detectar clics en las fronteras
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onDocumentMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  // Se recorre la lista de intersecciones y se muestra la información del primer objeto que tenga datos (userData)
  for (let i = 0; i < intersects.length; i++) {
    const obj = intersects[i].object;
    if (obj.userData && obj.userData.nombre) {
      showCountryInfo(obj.userData);
      break;
    }
  }
}

// Muestra la información del objeto (región) en el panel lateral y agrega el botón "Ver más" para redirigir
function showCountryInfo(data) {
  // Formatear el nombre: eliminar "Región " y convertir a minúsculas (puedes mejorar el formateo para quitar acentos si es necesario)
  const regionKey = data.nombre.replace("Región ", "").toLowerCase();
  const countryNameEl = document.getElementById("country-name");
  const ecosystemsEl = document.getElementById("ecosystems");

  countryNameEl.textContent = data.nombre;
  ecosystemsEl.innerHTML = `
        <strong>Ciudades:</strong> ${
          data.ciudades ? data.ciudades.join(", ") : "N/A"
        }<br>
        <strong>Ecosistemas:</strong> ${
          data.ecosistemas ? data.ecosistemas.join(", ") : "N/A"
        }<br>
        <strong>Fauna:</strong> ${
          data.fauna ? data.fauna.join(", ") : "N/A"
        }<br>
        <strong>Flora:</strong> ${
          data.flora ? data.flora.join(", ") : "N/A"
        }<br>
        <button id="more-info-btn" style="margin-top:10px; padding:8px 12px; background:#3498db; border:none; color:#fff; border-radius:5px; cursor:pointer;">Ver más</button>
    `;

  document.getElementById("more-info-btn").addEventListener("click", () => {
    // Se redirige pasando el parámetro "region" con la clave formateada
    window.location.href =
      "infoEarth.html?region=" + encodeURIComponent(regionKey);
  });
}

// Función de animación
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Actualización del renderizado al cambiar el tamaño de la ventana
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Inicialización de todo al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  initEarth();
  createEarth();
  loadCountries();
  animate();
  document.addEventListener("click", onDocumentMouseClick, false);
});
