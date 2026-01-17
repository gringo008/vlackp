// ============================
// IMPORTS FIREBASE
// ============================



import { auth, db, storage } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ✅ IMPORTAR SISTEMA DE VENTAS (PEDIDOS EN VIVO)
import { cargarVentasEnTiempoReal, actualizarEstadoVenta } from "./ventas.js";


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
        const statusEl = document.getElementById("adminStatus");
        if (statusEl) statusEl.textContent = `Logueado como: ${email}`;
        document.querySelectorAll(".admin-action").forEach(b => b.disabled = false);
      } catch (e) {
        console.warn("No se pudo actualizar el estado del admin en el DOM", e);
      }
    })
    .catch(() => alert("Usuario o contraseña incorrectos"));
}


// ============================
// 🚪 LOGOUT (FUNCIONA)
// ============================
async function logout() {
  try {
    await signOut(auth);
    alert("Sesión cerrada ✅");
  } catch (err) {
    console.error("Error cerrando sesión:", err);
    alert("Error cerrando sesión: " + (err.message || err));
  }
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
    const statusEl = document.getElementById("adminStatus");
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = isError ? "#ff6666" : "#0f0";
    }
    console.log("ADMIN STATUS:", msg);
  } catch (e) { console.warn("setAdminStatus error", e); }
}


// ============================
// 📤 SUBIR IMAGEN
// ============================
async function subirImagen(archivo, carpeta) {
  if (!archivo) return null;

  // Verificar que el usuario esté autenticado
  if (!auth || !auth.currentUser) {
    const msg = "Debes iniciar sesión antes de subir imágenes.";
    console.error(msg);
    alert(msg);
    return null;
  }

  try {
    setAdminStatus("Subiendo imagen...", false);
    const refImg = ref(storage, `${carpeta}/${archivo.name}`);
    const uploadResult = await uploadBytes(refImg, archivo);
    console.log("uploadResult:", uploadResult);
    const url = await getDownloadURL(refImg);
    setAdminStatus("Imagen subida correctamente ✅", false);
    return url;
  } catch (err) {
    console.error("Error subiendo imagen:", err);
    setAdminStatus("Error al subir imagen: " + (err.message || err), true);
    alert("Error al subir imagen: " + (err.message || err));
    return null;
  }
}


// ============================
// 🧉 AGREGAR TRAGO
// ============================
async function agregarTrago() {
  let img = null;
  try {
    setAdminStatus("Iniciando agregado de trago...", false);
    const archivo = document.getElementById("tragoImagenArchivo").files[0];
    const url = document.getElementById("tragoImagenURL").value;
    const imagenSelect = document.getElementById("tragoImagenSelect").value;
    const skip = document.getElementById("skipUploadTrago") && document.getElementById("skipUploadTrago").checked;

    if (!skip && archivo) img = await subirImagen(archivo, "tragos");
    if (url) img = url;
    if (imagenSelect) img = imagenSelect;

    const nombre = document.getElementById("tragoNombre").value;
    const precio = document.getElementById("tragoPrecio").value;

    setAdminStatus("Guardando trago en Firestore...", false);
    const docRef = await addDoc(collection(db, "tragos"), {
      nombre,
      precio,
      imagen: img || "",
      createdAt: new Date().toISOString()
    });

    console.log("Trago agregado con id:", docRef.id);
    setAdminStatus("Trago agregado correctamente ✅", false);
    alert("Trago agregado!");
    cargarTragos();
  } catch (err) {
    console.error("Error agregando trago:", err);
    setAdminStatus("Error al agregar trago: " + (err.message || err), true);
    alert("Error al agregar trago: " + (err.message || err));
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
    const img = p.imagen ? p.imagen : "https://via.placeholder.com/70";
    tbody.innerHTML += `
      <tr>
        <td><img src="${img}" width="70"></td>
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
      imagen: img || ""
    });

    console.log("Promo agregada con id:", docRef.id);
    alert("Promo agregada!");
    cargarPromos();
  } catch (err) {
    console.error("Error agregando promo:", err);
    alert("Error al agregar promo: " + (err.message || err));
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
    const img = p.imagen ? p.imagen : "https://via.placeholder.com/70";
    tbody.innerHTML += `
      <tr>
        <td><img src="${img}" width="70"></td>
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
      imagen: img || ""
    });

    console.log("Comida agregada con id:", docRef.id);
    alert("Comida agregada!");
    cargarComidas();
  } catch (err) {
    console.error("Error agregando comida:", err);
    alert("Error al agregar comida: " + (err.message || err));
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
    const img = p.imagen ? p.imagen : "https://via.placeholder.com/70";
    tbody.innerHTML += `
      <tr>
        <td><img src="${img}" width="70"></td>
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
// ✏️ EDITAR DOCUMENTO
// ============================
async function editar(coleccion, id) {
  try {
    const dRef = doc(db, coleccion, id);
    const snapshot = await getDoc(dRef);

    if (!snapshot.exists()) {
      alert("Documento no encontrado");
      return;
    }

    const data = snapshot.data();
    const nuevoNombre = prompt("Nuevo nombre:", data.nombre || "");
    if (nuevoNombre === null) return;

    const nuevoPrecio = prompt("Nuevo precio:", data.precio || "");
    if (nuevoPrecio === null) return;

    const nuevaImagen = prompt("Nueva imagen (URL) - dejar vacío para mantener:", data.imagen || "");
    if (nuevaImagen === null) return;

    await updateDoc(dRef, {
      nombre: nuevoNombre,
      precio: nuevoPrecio,
      imagen: nuevaImagen || data.imagen
    });

    alert("Documento actualizado ✅");
    cargarTodo();
  } catch (err) {
    console.error("Error editando documento:", err);
    alert("Error al editar: " + (err.message || err));
  }
}


// ======================================================
// 📦 PEDIDOS EN VIVO (ADMIN PRO)
// ======================================================
let pedidosGlobal = [];
let filtroPedidos = "todos";
let pedidosVistos = new Set(); // para detectar pedidos nuevos

function iniciarPedidosEnTiempoReal() {
  cargarVentasEnTiempoReal((ventas) => {
    // Orden: Pendientes primero
    ventas.sort((a, b) => {
      const ea = a.estado || "Pendiente";
      const eb = b.estado || "Pendiente";
      if (ea === "Pendiente" && eb !== "Pendiente") return -1;
      if (ea !== "Pendiente" && eb === "Pendiente") return 1;
      return 0;
    });

    // Detectar pedidos nuevos (solo Pendientes)
    detectarPedidosNuevos(ventas);

    pedidosGlobal = ventas;
    actualizarContadorPendientes(ventas);
    renderPedidos(ventas);
  });
}

function detectarPedidosNuevos(ventas) {
  const pendientes = ventas.filter(v => (v.estado || "Pendiente") === "Pendiente");
  let hayNuevo = false;

  pendientes.forEach(p => {
    if (p.id && !pedidosVistos.has(p.id)) {
      pedidosVistos.add(p.id);
      hayNuevo = true;
      p.__nuevo = true; // marca para render
    }
  });

  if (hayNuevo) {
    reproducirSonidoPedido();
  }
}

function reproducirSonidoPedido() {
  const audio = document.getElementById("pedidoSound");

  // Si no existe audio -> beep automático
  if (!audio) {
    beepSimple();
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // si el navegador bloquea autoplay
    beepSimple();
  });
}

function beepSimple() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.value = 0.05;
    osc.start();

    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 180);
  } catch (e) {}
}

function actualizarContadorPendientes(ventas) {
  const pendientes = ventas.filter(v => (v.estado || "Pendiente") === "Pendiente").length;
  const btn = document.querySelector(".btn-pedidos");
  if (btn) {
    btn.textContent = pendientes > 0 ? `📦 Pedidos (${pendientes})` : `📦 Pedidos en vivo`;
  }
}

function renderPedidos(ventas) {
  const cont = document.getElementById("pedidosList");
  if (!cont) return;

  let filtradas = ventas;
  if (filtroPedidos !== "todos") {
    filtradas = ventas.filter(v => (v.estado || "Pendiente") === filtroPedidos);
  }

  if (filtradas.length === 0) {
    cont.innerHTML = "<p style='color:#888'>No hay pedidos</p>";
    return;
  }

  cont.innerHTML = filtradas.map(p => {
    const estado = p.estado || "Pendiente";

    const items = (p.productos || [])
      .map(i => `• ${i.nombre} - $${i.precio}`)
      .join("<br>");

    return `
      <div class="pedido-card">
        <div class="pedido-header">
          <div class="pedido-total">$${p.total}</div>
          <div class="estado estado-${estado}">${estado}</div>
        </div>

        <div class="pedido-info">
          📞 ${p.telefono || "Sin teléfono"} <br>
          🚚 ${p.entrega} <br>
          ${p.entrega?.toLowerCase().includes("env") ? `📍 ${p.direccion}` : ""}
        </div>

        <div class="pedido-items">${items}</div>

        <div class="pedido-actions">
          ${botonesSegunEstado(p)}
        </div>
      </div>
    `;
  }).join("");
}

const entrega = p.entrega || "No especificado";

let direccionTexto = "📍 Retiro en el local";
if (
  entrega.toLowerCase().includes("env") &&
  p.direccion &&
  p.direccion.trim() !== ""
) {
  direccionTexto = `📍 ${p.direccion}`;
}


    return `
      <div class="pedido-card ${esNuevo ? "pedido-nuevo" : ""}">
        <div class="pedido-top">
          <div>
            <div class="pedido-fecha">🕒 ${fecha}</div>
            <div style="margin-top:4px; font-weight:800; color:#ccc;">
              🚚 ${entrega} • 💳 ${metodo}
            </div>
            ${esNuevo ? `<div class="badge-nuevo">🟡 PEDIDO NUEVO</div>` : ""}
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <div class="pedido-total">$${total}</div>
            <div class="estado-pill estado-${estado}">${estado}</div>
          </div>
        </div>

        <div class="pedido-body">
          <div class="pedido-box">
            <h4>🧾 Productos</h4>
            <div class="pedido-items">${itemsHTML || "<div>Sin productos</div>"}</div>
          </div>

          <div class="pedido-box">
            <h4>👤 Cliente</h4>
            <div class="pedido-items">
              <div>📞 ${tel || "No proporcionado"}</div>
              <div>📍 ${direccion}</div>
            </div>
          </div>
        </div>

        <div class="pedido-actions">
          ${botonesSegunEstado(p.id, estado, tel, total)}
        </div>
      </div>
    `;
  
function botonesPedido(p) {
  const pedidoStr = JSON.stringify(p).replace(/"/g, '&quot;');

  return `
    ${p.estado === "Pendiente" ? `
      <button class="btn btn-aceptar"
        onclick="cambiarEstadoPedido('${p.id}','Preparando')">
        ✅ Aceptar
      </button>
      <button class="btn btn-cancelar"
        onclick="cambiarEstadoPedido('${p.id}','Cancelado')">
        ❌ Cancelar
      </button>
    ` : ""}

    ${p.estado === "Preparando" ? `
      <button class="btn btn-estado"
        onclick="cambiarEstadoPedido('${p.id}','Listo')">
        📦 Listo
      </button>
    ` : ""}

    ${p.estado === "Listo" ? `
      <button class="btn btn-estado"
        onclick="cambiarEstadoPedido('${p.id}','Entregado')">
        ✅ Entregado
      </button>
    ` : ""}

    <button class="btn btn-wsp"
      onclick="enviarWhatsAppCliente(${pedidoStr})">
      📲 WhatsApp
    </button>
  `;
}

async function cambiarEstado(id, nuevoEstado) {
  const pedido = pedidosGlobal.find(p => p.id === id);
  if (!pedido) return;

  await actualizarEstadoVenta(id, nuevoEstado);


  let mensaje = `Hola ${pedido.nombre || ""} ${pedido.apellido || ""} 👋\n\n`;

  if (nuevoEstado === "Preparando") mensaje += "✅ Tu pedido fue ACEPTADO\n";
  if (nuevoEstado === "Cancelado") mensaje += "❌ Tu pedido fue CANCELADO\n";
  if (nuevoEstado === "Listo") mensaje += "📦 Tu pedido está LISTO\n";
  if (nuevoEstado === "Entregado") mensaje += "🎉 Tu pedido fue ENTREGADO\n";

  mensaje += `\n💰 Total: $${pedido.total}`;
  mensaje += `\n🚚 Entrega: ${pedido.entrega}`;

  if (pedido.entrega?.toLowerCase().includes("env")) {
    mensaje += `\n📍 Dirección: ${pedido.direccion}`;
  }

  mensaje += `\n\nGracias por tu compra 🍹`;

  const tel = limpiarTelefono(pedido.telefono);
  window.open(
    `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );



  const wspMsg = encodeURIComponent(
    `Hola! 👋 Te hablamos de VLACK POINT.\n\n✅ Tu pedido está en estado: ${estado}\n💰 Total: $${total}\n\nGracias por tu compra 🍸`
  );

  const btnWhatsApp = `<button class="btn-accion btn-wsp" onclick="abrirWhatsApp('${telLimpio}', '${wspMsg}')">📲 WhatsApp</button>`;

  if (estado === "Pendiente") {
    return `
      <button class="btn-accion btn-aceptar" onclick="cambiarEstadoPedido('${id}','Preparando')">✅ Aceptar</button>
      <button class="btn-accion btn-cancelar" onclick="cambiarEstadoPedido('${id}','Cancelado')">❌ Cancelar</button>
      ${btnWhatsApp}
    `;
  }

  if (estado === "Preparando") {
    return `
      <button class="btn-accion btn-listo" onclick="cambiarEstadoPedido('${id}','Listo')">📦 Marcar Listo</button>
      <button class="btn-accion btn-cancelar" onclick="cambiarEstadoPedido('${id}','Cancelado')">❌ Cancelar</button>
      ${btnWhatsApp}
    `;
  }

  if (estado === "Listo") {
    return `
      <button class="btn-accion btn-entregado" onclick="cambiarEstadoPedido('${id}','Entregado')">✅ Entregado</button>
      <button class="btn-accion btn-cancelar" onclick="cambiarEstadoPedido('${id}','Cancelado')">❌ Cancelar</button>
      ${btnWhatsApp}
    `;
  }

  return `
    <button class="btn-accion" onclick="cambiarEstadoPedido('${id}','Pendiente')">↩️ Reabrir</button>
    ${btnWhatsApp}
  `;


async function cambiarEstadoPedido(id, nuevoEstado) {
  const pedido = pedidosGlobal.find(p => p.id === id);
  if (!pedido) return;

  await actualizarEstadoVenta(id, nuevoEstado);
  enviarWhatsAppEstado(pedido, nuevoEstado);
}

function enviarWhatsAppEstado(pedido, nuevoEstado) {
  if (!pedido || !pedido.telefono) return;

  let mensaje = `Hola ${pedido.nombre || ""} ${pedido.apellido || ""} 👋\n\n`;

  if (nuevoEstado === "Preparando") mensaje += "✅ Tu pedido fue ACEPTADO\n";
  if (nuevoEstado === "Cancelado") mensaje += "❌ Tu pedido fue CANCELADO\n";
  if (nuevoEstado === "Listo") mensaje += "📦 Tu pedido está LISTO\n";
  if (nuevoEstado === "Entregado") mensaje += "🎉 Tu pedido fue ENTREGADO\n";

  mensaje += `\n💰 Total: $${pedido.total}`;
  mensaje += `\n🚚 Entrega: ${pedido.entrega}`;

  if (pedido.entrega?.toLowerCase().includes("env")) {
    mensaje += `\n📍 Dirección: ${pedido.direccion}`;
  }

  mensaje += `\n\nGracias por tu compra 🍹`;

  const tel = limpiarTelefono(pedido.telefono);
  window.open(
    `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );
}


 



function filtrarPedidosEstado(estado) {
  filtroPedidos = estado;

  document.querySelectorAll(".filtro-estado .filtro-btn").forEach(btn => btn.classList.remove("active"));
  const botones = Array.from(document.querySelectorAll(".filtro-estado .filtro-btn"));

  if (estado === "todos") botones[0].classList.add("active");
  if (estado === "Pendiente") botones[1].classList.add("active");
  if (estado === "Preparando") botones[2].classList.add("active");
  if (estado === "Listo") botones[3].classList.add("active");
  if (estado === "Entregado") botones[4].classList.add("active");
  if (estado === "Cancelado") botones[5].classList.add("active");

  renderPedidos(pedidosGlobal);
}

function mostrarPedidosEnVivo() {
  const pedidosPanel = document.getElementById("pedidosEnVivoPanel");
  const panelProductos = document.getElementById("panelProductos");

  if (!pedidosPanel) return;

  const estaAbierto = pedidosPanel.style.display === "block";

  if (estaAbierto) {
    pedidosPanel.style.display = "none";
    if (panelProductos) panelProductos.style.display = "block";
  } else {
    pedidosPanel.style.display = "block";
    if (panelProductos) panelProductos.style.display = "none";
    iniciarPedidosEnTiempoReal();
  }
}


// ============================
// 🚀 EXPORTAR FUNCIONES AL HTML
// ============================
window.login = login;
window.logout = logout;
window.mostrarSeccion = mostrarSeccion;
window.agregarTrago = agregarTrago;
window.agregarPromo = agregarPromo;
window.agregarComida = agregarComida;
window.eliminar = eliminar;
window.cargarTodo = cargarTodo;

// pedidos
window.mostrarPedidosEnVivo = mostrarPedidosEnVivo;
window.filtrarPedidosEstado = filtrarPedidosEstado;
window.cambiarEstadoPedido = cambiarEstadoPedido;
window.abrirWhatsApp = abrirWhatsApp;


// ============================
// ✅ ESCUCHAR CAMBIOS DE AUTH
// ============================
onAuthStateChanged(auth, (user) => {
  const statusEl = document.getElementById("adminStatus");

  if (user) {
    if (statusEl) statusEl.textContent = `Logueado como: ${user.email}`;
    document.querySelectorAll(".admin-action").forEach(b => b.disabled = false);

    try { document.getElementById("loginBox").style.display = "none"; } catch(e) {}
    try { document.getElementById("adminPanel").style.display = "block"; } catch(e) {}
    try { cargarTodo(); } catch(e) { console.warn("cargarTodo failed", e); }

    // 🔥 CLAVE ABSOLUTA
    iniciarPedidosEnTiempoReal();

  } else {
    if (statusEl) statusEl.textContent = "No autenticado";
    document.querySelectorAll(".admin-action").forEach(b => b.disabled = true);

    try { document.getElementById("loginBox").style.display = "block"; } catch(e) {}
    try { document.getElementById("adminPanel").style.display = "none"; } catch(e) {}
  }
});
}
function enviarWhatsAppCliente(pedido) {
  if (!pedido || !pedido.telefono) {
    alert("Este pedido no tiene teléfono cargado");
    return;
  }

  let mensaje = `Hola 👋\n\n`;
  mensaje += `🧾 *Estado:* ${pedido.estado}\n`;
  mensaje += `💰 *Total:* $${pedido.total}\n`;
  mensaje += `🚚 *Entrega:* ${pedido.entrega}\n`;

  if (pedido.entrega?.toLowerCase().includes("env")) {
    mensaje += `📍 *Dirección:* ${pedido.direccion}\n`;
  }

  mensaje += `\nGracias por tu compra 🍹`;

  const tel = limpiarTelefono(pedido.telefono);
  window.open(
    `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );
}
async function cambiarEstadoPedido(id, nuevoEstado) {
  await actualizarEstadoVenta(id, nuevoEstado);
}
function detectarPedidosNuevos(pedidos) {
  let hayNuevo = false;

  pedidos.forEach(p => {
    if (p.estado === "Pendiente" && !pedidosVistos.has(p.id)) {
      pedidosVistos.add(p.id);
      p.__nuevo = true; // marca visual
      hayNuevo = true;
    }
  });

  if (hayNuevo) reproducirSonidoPedido();
}
