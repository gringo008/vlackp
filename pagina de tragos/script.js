// ==========================
// 🔹 SCRIPT PRINCIPAL - FIRESTORE
// ==========================
import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ✅ NUEVO: usar el sistema PRO
import { crearVenta } from "./ventas.js";

// ==========================
// 🔹 1) VARIABLES (LOCAL)
// ==========================
let tragos = [];
let promos = [];
let comidas = [];
let cart = JSON.parse(localStorage.getItem("carrito")) || [];
let currentSection = "tragos";

// ==========================
// 🔹 2) CARGAR DESDE FIRESTORE EN TIEMPO REAL
// ==========================
function cargarDesdeFirestore() {
  // Cargar TRAGOS
  onSnapshot(collection(db, "tragos"), (snapshot) => {
    console.log("Snapshot TRAGOS received, docs:", snapshot.size);
    tragos = [];
    snapshot.forEach((doc) => {
      const d = { id: doc.id, ...doc.data() };
      tragos.push(d);
    });
    console.log("Loaded tragos array length:", tragos.length, tragos);
    if (currentSection === "tragos") cargarProductos(tragos);
  });

  // Cargar PROMOS
  onSnapshot(collection(db, "promos"), (snapshot) => {
    console.log("Snapshot PROMOS received, docs:", snapshot.size);
    promos = [];
    snapshot.forEach((doc) => {
      const d = { id: doc.id, ...doc.data() };
      promos.push(d);
    });
    console.log("Loaded promos array length:", promos.length, promos);
    if (currentSection === "promos") cargarProductos(promos);
  });

  // Cargar COMIDAS
  onSnapshot(collection(db, "comidas"), (snapshot) => {
    console.log("Snapshot COMIDAS received, docs:", snapshot.size);
    comidas = [];
    snapshot.forEach((doc) => {
      const d = { id: doc.id, ...doc.data() };
      comidas.push(d);
    });
    console.log("Loaded comidas array length:", comidas.length, comidas);
    if (currentSection === "comidas") cargarProductos(comidas);
  });
}

// Iniciar carga de Firestore
cargarDesdeFirestore();

// ==========================
// 🔹 3) NAVEGACIÓN
// ==========================
function mostrarSeccion(tipo) {
  if (tipo === "tragos") cargarProductos(tragos);
  if (tipo === "promos") cargarProductos(promos);
  if (tipo === "comidas") cargarProductos(comidas);
  currentSection = tipo;
}

// ==========================
// 🔹 4) CARGAR PRODUCTOS EN LA PÁGINA
// ==========================
const drinkList = document.getElementById("drinkList");

function cargarProductos(lista) {
  drinkList.innerHTML = "";
  lista.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "drink-card";
    card.style.animationDelay = `${index * 0.1}s`;

    const nombre = item.nombre || "Producto";
    const precio = Number(item.precio) || 0;
    const imagen = item.imagen || "img/default.jpg";

    card.innerHTML = `
            <img src="${imagen}" alt="${nombre}">
            <div class="drink-card-content">
                <h3>${nombre}</h3>
                <p>$${precio}</p>
                <button onclick="agregarCarrito('${escapeQuotes(nombre)}', ${precio}, '${escapeQuotes(imagen)}')">Agregar 🛒</button>
            </div>
        `;
    drinkList.appendChild(card);
  });
}

// ✅ evita romper HTML por comillas
function escapeQuotes(text) {
  return String(text).replace(/'/g, "\\'");
}

// ==========================
// 🔹 5) CARRITO
// ==========================
function agregarCarrito(nombre, precio, imagen) {
  cart.push({ nombre, precio: Number(precio) || 0, imagen });
  localStorage.setItem("carrito", JSON.stringify(cart));
  actualizarCartCount();
  animarCarrito();
  mostrarCarrito();
  openCart();
}

function actualizarCartCount() {
  document.getElementById("cartCount").textContent = cart.length;
}

function mostrarCarrito() {
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");

  cartItems.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
            <img src="${item.imagen || "img/default.jpg"}" class="cart-img" alt="${item.nombre}">
            <span>${item.nombre}</span>
            <span>$${item.precio}</span>
            <button class="remove-btn" onclick="eliminarItem(${index})">✕</button>
        `;
    cartItems.appendChild(li);
    total += Number(item.precio) || 0;
  });

  cartTotal.textContent = total;
}

function eliminarItem(index) {
  cart.splice(index, 1);
  localStorage.setItem("carrito", JSON.stringify(cart));
  actualizarCartCount();
  mostrarCarrito();
}

// ==========================
// 🔹 6) MODAL DEL CARRITO
// ==========================
function openCart() {
  document.getElementById("cartModal").style.display = "block";
  mostrarCarrito();
}

function closeCart() {
  document.getElementById("cartModal").style.display = "none";
}

function animarCarrito() {
  const cartIcon = document.querySelector(".cart-icon");
  cartIcon.classList.add("animate");
  setTimeout(() => cartIcon.classList.remove("animate"), 600);
}

function toggleDeliveryFields() {
  const delivery = document.getElementById("deliveryMethod").value;
  const fields = document.getElementById("deliveryFields");
  if (delivery === "Envío a domicilio") {
    fields.style.display = "block";
  } else {
    fields.style.display = "none";
  }
}

// ==========================
// 🔹 7) FINALIZAR PEDIDO (PRO)
// ==========================
async function finalizarPedido() {
  if (cart.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  const metodo = document.getElementById("paymentMethod").value;
  const entrega = document.getElementById("deliveryMethod").value;

  const direccionInput = document.getElementById("direccion");
  const telefonoInput = document.getElementById("telefono");

  const direccion = direccionInput ? direccionInput.value.trim() : "";
  const telefono = telefonoInput ? telefonoInput.value.trim() : "";

  // ✅ si es envío, dirección obligatoria
  if (entrega === "Envío a domicilio" && !direccion) {
    alert("⚠️ Tenés que poner una dirección para el envío.");
    return;
  }

  // total
  const total = cart.reduce((a, b) => a + (Number(b.precio) || 0), 0);

  // 🔥 1) Guardar pedido en Firestore (PRO)
  let pedidoId = null;
  try {
    pedidoId = await crearVenta({
      productos: cart,
      total,
      telefono,
      direccion: entrega === "Envío a domicilio" ? direccion : "Retiro",
      metodo,
      entrega
    });

    console.log("✅ Pedido guardado en Firestore ID:", pedidoId);
  } catch (e) {
    console.error("❌ No se pudo registrar la venta en Firestore:", e);
  }

  // 🔥 2) WhatsApp (como ya lo tenías)
  let mensaje = `📦 *NUEVO PEDIDO*%0A%0A`;

  if (pedidoId) {
    mensaje += `🆔 *Pedido:* ${pedidoId}%0A%0A`;
  }

  mensaje += `*Productos:*%0A`;
  cart.forEach((item) => {
    mensaje += `- ${item.nombre} x1: $${item.precio}%0A`;
  });

  mensaje += `%0A*Total: $${total}*%0A`;
  mensaje += `*Método de pago:* ${metodo}%0A`;
  mensaje += `*Entrega:* ${entrega}%0A`;

  if (entrega === "Envío a domicilio") {
    mensaje += `*Dirección:* ${direccion}%0A`;
  }

  if (telefono) {
    mensaje += `*Teléfono:* ${telefono}%0A`;
  }

  window.open(`https://wa.me/543516577826?text=${mensaje}`, "_blank");

  alert("✅ Pedido enviado! Gracias por tu compra");

  cart = [];
  localStorage.setItem("carrito", JSON.stringify(cart));
  actualizarCartCount();
  closeCart();
}

// ==========================
// 🔥 8) EXPONER FUNCIONES GLOBALES Y CARGAR
// ==========================
window.mostrarSeccion = mostrarSeccion;
window.agregarCarrito = agregarCarrito;
window.openCart = openCart;
window.closeCart = closeCart;
window.eliminarItem = eliminarItem;
window.toggleDeliveryFields = toggleDeliveryFields;
window.finalizarPedido = finalizarPedido;

// Cargar al inicio
actualizarCartCount();
mostrarSeccion("tragos");

// Debug helper
window.debugShowArrays = function () {
  console.log("DEBUG tragos:", tragos);
  console.log("DEBUG promos:", promos);
  console.log("DEBUG comidas:", comidas);
};
