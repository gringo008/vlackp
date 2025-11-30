// ==========================
// 🔹 SCRIPT PRINCIPAL - FIRESTORE
// ==========================
import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { guardarVenta } from "./ventas.js";

// ==========================
// 🔹 1) VARIABLES (LOCAL)
// ==========================
let tragos = [];
let promos = [];
let comidas = [];
let cart = JSON.parse(localStorage.getItem('carrito')) || [];
let currentSection = 'tragos';

// ==========================
// 🔹 2) CARGAR DESDE FIRESTORE EN TIEMPO REAL
// ==========================
function cargarDesdeFirestore() {
  // Cargar TRAGOS
  onSnapshot(collection(db, "tragos"), (snapshot) => {
        console.log('Snapshot TRAGOS received, docs:', snapshot.size);
        tragos = [];
        snapshot.forEach((doc) => {
            const d = { id: doc.id, ...doc.data() };
            tragos.push(d);
        });
        console.log('Loaded tragos array length:', tragos.length, tragos);
        if (currentSection === 'tragos') cargarProductos(tragos);
  });

  // Cargar PROMOS
  onSnapshot(collection(db, "promos"), (snapshot) => {
        console.log('Snapshot PROMOS received, docs:', snapshot.size);
        promos = [];
        snapshot.forEach((doc) => {
            const d = { id: doc.id, ...doc.data() };
            promos.push(d);
        });
        console.log('Loaded promos array length:', promos.length, promos);
        if (currentSection === 'promos') cargarProductos(promos);
  });

  // Cargar COMIDAS
  onSnapshot(collection(db, "comidas"), (snapshot) => {
        console.log('Snapshot COMIDAS received, docs:', snapshot.size);
        comidas = [];
        snapshot.forEach((doc) => {
            const d = { id: doc.id, ...doc.data() };
            comidas.push(d);
        });
        console.log('Loaded comidas array length:', comidas.length, comidas);
        if (currentSection === 'comidas') cargarProductos(comidas);
  });
}

// Iniciar carga de Firestore
cargarDesdeFirestore();


// ==========================
// 🔹 3) NAVEGACIÓN
// ==========================
function mostrarSeccion(tipo) {
    if (tipo === 'tragos') cargarProductos(tragos);
    if (tipo === 'promos') cargarProductos(promos);
    if (tipo === 'comidas') cargarProductos(comidas);
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

        card.innerHTML = `
            <img src="${item.imagen || 'img/default.jpg'}" alt="${item.nombre}">
            <div class="drink-card-content">
                <h3>${item.nombre}</h3>
                <p>$${item.precio}</p>
                <button onclick="agregarCarrito('${item.nombre}', ${item.precio}, '${item.imagen}')">Agregar 🛒</button>
            </div>
        `;
        drinkList.appendChild(card);
    });
}


// ==========================
// 🔹 5) CARRITO
// ==========================
function agregarCarrito(nombre, precio, imagen) {
    cart.push({ nombre, precio, imagen });
    localStorage.setItem("carrito", JSON.stringify(cart));
    actualizarCartCount();
    animarCarrito();
    mostrarCarrito();
    openCart();
}

function actualizarCartCount() {
    document.getElementById("cartCount").textContent = cart.length;
};

function mostrarCarrito() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");

    cartItems.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <img src="${item.imagen || 'img/default.jpg'}" class="cart-img" alt="${item.nombre}">
            <span>${item.nombre}</span>
            <span>$${item.precio}</span>
            <button class="remove-btn" onclick="eliminarItem(${index})">✕</button>
        `;
        cartItems.appendChild(li);
        total += item.precio;
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
// 🔹 7) FINALIZAR PEDIDO
// ==========================
async function finalizarPedido() {
    if (cart.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    const metodo = document.getElementById("paymentMethod").value;
    const entrega = document.getElementById("deliveryMethod").value;
    const direccion = document.getElementById("direccion").value || "Retiro";
    const telefono = document.getElementById("telefono").value || "No proporcionado";

    let mensaje = `📦 *NUEVO PEDIDO*%0A%0A`;
    mensaje += `*Productos:*%0A`;
    cart.forEach(item => {
        mensaje += `- ${item.nombre} x1: $${item.precio}%0A`;
    });
    const total = cart.reduce((a, b) => a + b.precio, 0);
    mensaje += `%0A*Total: $${total}*%0A`;
    mensaje += `*Método de pago:* ${metodo}%0A`;
    mensaje += `*Entrega:* ${entrega}%0A`;
    if (entrega === "Envío a domicilio") {
        mensaje += `*Dirección:* ${direccion}%0A`;
        mensaje += `*Teléfono:* ${telefono}%0A`;
    }

    // Primero intentamos guardar la venta en Firestore
    try {
        await guardarVenta(metodo, entrega, direccion, telefono, total, cart);
        console.log('Venta registrada correctamente en Firestore');
    } catch (e) {
        console.error('No se pudo registrar la venta en Firestore:', e);
    }

    // Abrir WhatsApp con el pedido
    window.open(`https://wa.me/543516577826?text=${mensaje}`, "_blank");

    alert("Pedido enviado! Gracias por tu compra");
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
mostrarSeccion('tragos');

// Debug helper to log current arrays
window.debugShowArrays = function() {
    console.log('DEBUG tragos:', tragos);
    console.log('DEBUG promos:', promos);
    console.log('DEBUG comidas:', comidas);
}
