// ============================
// IMPORTS FIREBASE
// ============================
import { auth, db, storage } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";


// ============================
// 🔓 LOGIN
// ============================
function login() {
  const user = document.getElementById("user").value;
  const pass = document.getElementById("pass").value;

  signInWithEmailAndPassword(auth, user, pass)
    .then(() => {
      document.getElementById("loginBox").style.display = "none";
      document.getElementById("adminPanel").style.display = "block";
      cargarTodo(); // carga todo al entrar

      // Mostrar estado de admin y habilitar acciones
      try {
        const email = auth.currentUser && auth.currentUser.email ? auth.currentUser.email : user;
        const statusEl = document.getElementById('adminStatus');
        if (statusEl) statusEl.textContent = `Logueado como: ${email}`;
        document.querySelectorAll('.admin-action').forEach(b => b.disabled = false);
      } catch (e) {
        console.warn('No se pudo actualizar el estado del admin en el DOM', e);
      }
    })
    .catch(() => alert("Usuario o contraseña incorrectos"));
}


// ============================
// 🧭 CAMBIAR SECCIÓN
// ============================
function mostrarSeccion(nombre) {
  document.querySelectorAll(".seccion-panel").forEach(s => s.style.display = "none");
  document.getElementById(`seccion-${nombre}`).style.display = "block";
}

function setAdminStatus(msg, isError = false) {
  try {
    const statusEl = document.getElementById('adminStatus');
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = isError ? '#ff6666' : '#0f0';
    }
    console.log('ADMIN STATUS:', msg);
  } catch (e) { console.warn('setAdminStatus error', e); }
}


// ============================
// 📤 SUBIR IMAGEN
// ============================
async function subirImagen(archivo, carpeta) {
  if (!archivo) return null;

  // Verificar que el usuario esté autenticado (evita errores por reglas o preflight con respuesta 401/403)
  if (!auth || !auth.currentUser) {
    const msg = 'Debes iniciar sesión antes de subir imágenes.';
    console.error(msg);
    alert(msg);
    return null;
  }

  try {
    setAdminStatus('Subiendo imagen...', false);
    const refImg = ref(storage, `${carpeta}/${archivo.name}`);
    const uploadResult = await uploadBytes(refImg, archivo);
    console.log('uploadResult:', uploadResult);
    const url = await getDownloadURL(refImg);
    setAdminStatus('Imagen subida correctamente', false);
    return url;
  } catch (err) {
    console.error('Error subiendo imagen:', err);
    setAdminStatus('Error al subir imagen: ' + (err.message || err), true);
    alert('Error al subir imagen: ' + (err.message || err));
    return null;
  }
}


// ============================
// 🧉 AGREGAR TRAGO
// ============================
async function agregarTrago() {
  let img = null;
  try {
    setAdminStatus('Iniciando agregado de trago...', false);
    const archivo = document.getElementById("tragoImagenArchivo").files[0];
    const url = document.getElementById("tragoImagenURL").value;
    const imagenSelect = document.getElementById("tragoImagenSelect").value;
    const skip = document.getElementById("skipUploadTrago") && document.getElementById("skipUploadTrago").checked;
    
    if (!skip && archivo) img = await subirImagen(archivo, "tragos");
    if (url) img = url;
    if (imagenSelect) img = imagenSelect;

    if (!img) {
      console.warn('No se proporcionó imagen ni URL, la imagen quedará vacía');
    }

    const nombre = document.getElementById("tragoNombre").value;
    const precio = document.getElementById("tragoPrecio").value;

    setAdminStatus('Guardando trago en Firestore...', false);
    const docRef = await addDoc(collection(db, "tragos"), {
      nombre,
      precio,
      imagen: img,
      createdAt: new Date().toISOString()
    });

    console.log('Trago agregado con id:', docRef.id);
    setAdminStatus('Trago agregado correctamente', false);
    alert("Trago agregado!");
    cargarTragos();
  } catch (err) {
    console.error('Error agregando trago:', err);
    setAdminStatus('Error al agregar trago: ' + (err.message || err), true);
    alert('Error al agregar trago: ' + (err.message || err));
  }
}


// ============================
// 🚀 CARGAR TRAGOS
// ============================
async function cargarTragos() {
  const tbody = document.querySelector("#tablaTragos tbody");
  tbody.innerHTML = "";
  const data = await getDocs(collection(db, "tragos"));
  data.forEach(d => {
    const p = d.data();
    tbody.innerHTML += `
      <tr>
        <td><img src="${p.imagen}" width="70"></td>
        <td>${p.nombre}</td>
        <td>$${p.precio}</td>
        <td>
          <button onclick="editar('tragos', '${d.id}')">✏️</button>
          <button onclick="eliminar('tragos', '${d.id}')">❌</button>
        </td>
      </tr>
    `;
  });
}


// ============================
// 🧯 ELIMINAR
// ============================
async function eliminar(coleccion, id) {
  await deleteDoc(doc(db, coleccion, id));
  cargarTodo();
}


// ============================
// 🔄 CARGAR TODO AL ENTRAR
// ============================
async function cargarTodo() {
  cargarTragos();
  cargarPromos();
  cargarComidas();
}

// ============================
// 🧉 AGREGAR PROMO
// ============================
async function agregarPromo() {
  try {
    let img = null;
    const archivo = document.getElementById("promoImagenArchivo").files[0];
    const url = document.getElementById("promoImagenURL").value;
    const imagenSelect = document.getElementById("promoImagenSelect").value;
    const skip = document.getElementById("skipUploadPromo") && document.getElementById("skipUploadPromo").checked;
    if (!skip && archivo) img = await subirImagen(archivo, "promos");
    if (url) img = url;
    if (imagenSelect) img = imagenSelect;

    const nombre = document.getElementById("promoNombre").value;
    const precio = document.getElementById("promoPrecio").value;

    const docRef = await addDoc(collection(db, "promos"), {
      nombre,
      precio,
      imagen: img,
    });

    console.log('Promo agregada con id:', docRef.id);
    alert("Promo agregada!");
    cargarPromos();
  } catch (err) {
    console.error('Error agregando promo:', err);
    alert('Error al agregar promo: ' + (err.message || err));
  }
}

// ============================
// 🚀 CARGAR PROMOS
// ============================
async function cargarPromos() {
  const tbody = document.querySelector("#tablaPromos tbody");
  tbody.innerHTML = "";
  const data = await getDocs(collection(db, "promos"));
  data.forEach(d => {
    const p = d.data();
    tbody.innerHTML += `
      <tr>
        <td><img src="${p.imagen}" width="70"></td>
        <td>${p.nombre}</td>
        <td>$${p.precio}</td>
        <td>
          <button onclick="editar('promos', '${d.id}')">✏️</button>
          <button onclick="eliminar('promos', '${d.id}')">❌</button>
        </td>
      </tr>
    `;
  });
}

// ============================
// 🍔 AGREGAR COMIDA
// ============================
async function agregarComida() {
  try {
    let img = null;
    const archivo = document.getElementById("comidaImagenArchivo").files[0];
    const url = document.getElementById("comidaImagenURL").value;
    const imagenSelect = document.getElementById("comidaImagenSelect").value;
    const skip = document.getElementById("skipUploadComida") && document.getElementById("skipUploadComida").checked;
    if (!skip && archivo) img = await subirImagen(archivo, "comidas");
    if (url) img = url;
    if (imagenSelect) img = imagenSelect;

    const nombre = document.getElementById("comidaNombre").value;
    const precio = document.getElementById("comidaPrecio").value;

    const docRef = await addDoc(collection(db, "comidas"), {
      nombre,
      precio,
      imagen: img,
    });

    console.log('Comida agregada con id:', docRef.id);
    alert("Comida agregada!");
    cargarComidas();
  } catch (err) {
    console.error('Error agregando comida:', err);
    alert('Error al agregar comida: ' + (err.message || err));
  }
}

// ============================
// 🚀 CARGAR COMIDAS
// ============================
async function cargarComidas() {
  const tbody = document.querySelector("#tablaComidas tbody");
  tbody.innerHTML = "";
  const data = await getDocs(collection(db, "comidas"));
  data.forEach(d => {
    const p = d.data();
    tbody.innerHTML += `
      <tr>
        <td><img src="${p.imagen}" width="70"></td>
        <td>${p.nombre}</td>
        <td>$${p.precio}</td>
        <td>
          <button onclick="editar('comidas', '${d.id}')">✏️</button>
          <button onclick="eliminar('comidas', '${d.id}')">❌</button>
        </td>
      </tr>
    `;
  });
}

// ============================
// ✏️ EDITAR DOCUMENTO (nombre, precio, imagen URL)
// ============================
async function editar(coleccion, id) {
  try {
    const dRef = doc(db, coleccion, id);
    const snapshot = await getDoc(dRef);
    if (!snapshot.exists()) {
      alert('Documento no encontrado');
      return;
    }
    const data = snapshot.data();
    const nuevoNombre = prompt('Nuevo nombre:', data.nombre || '');
    if (nuevoNombre === null) return; // cancel
    const nuevoPrecio = prompt('Nuevo precio:', data.precio || '');
    if (nuevoPrecio === null) return;
    const nuevaImagen = prompt('Nueva imagen (URL) - dejar vacío para mantener:', data.imagen || '');
    if (nuevaImagen === null) return;

    await updateDoc(dRef, {
      nombre: nuevoNombre,
      precio: nuevoPrecio,
      imagen: nuevaImagen || data.imagen
    });

    alert('Documento actualizado');
    cargarTodo();
  } catch (err) {
    console.error('Error editando documento:', err);
    alert('Error al editar: ' + (err.message || err));
  }
}

// ============================
// 🚀 ESTO ES CLAVE ‼️
// PERMITIR QUE EL HTML USE LAS FUNCIONES
// ============================
window.login = login;
window.mostrarSeccion = mostrarSeccion;
window.agregarTrago = agregarTrago;
window.agregarPromo = agregarPromo;
window.agregarComida = agregarComida;
window.eliminar = eliminar;
window.cargarTodo = cargarTodo;

// Escuchar cambios de estado de autenticación y actualizar UI en consecuencia
onAuthStateChanged(auth, (user) => {
  const statusEl = document.getElementById('adminStatus');
  if (user) {
    if (statusEl) statusEl.textContent = `Logueado como: ${user.email}`;
    document.querySelectorAll('.admin-action').forEach(b => b.disabled = false);
    // Mostrar panel si estaba oculto
    try { document.getElementById('loginBox').style.display = 'none'; } catch(e) {}
    try { document.getElementById('adminPanel').style.display = 'block'; } catch(e) {}
    try { cargarTodo(); } catch(e) { console.warn('cargarTodo failed', e); }
  } else {
    if (statusEl) statusEl.textContent = 'No autenticado';
    document.querySelectorAll('.admin-action').forEach(b => b.disabled = true);
    try { document.getElementById('loginBox').style.display = 'block'; } catch(e) {}
    try { document.getElementById('adminPanel').style.display = 'none'; } catch(e) {}
  }
});
