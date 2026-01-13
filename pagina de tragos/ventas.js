// ============================
// 📦 SISTEMA DE VENTAS (PEDIDOS)
// ============================
import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";


// ✅ Normaliza números y evita NaN
function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function limpiarTelefono(tel) {
  if (!tel) return "";
  return String(tel).replace(/\D/g, "");
}

function asegurarString(v) {
  return (v === undefined || v === null) ? "" : String(v).trim();
}

function asegurarArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

// ✅ Calcula total seguro desde productos
function calcularTotal(productos) {
  return asegurarArray(productos).reduce((acc, p) => acc + num(p.precio), 0);
}


// ======================================================
// ✅ CREAR VENTA (PEDIDO) - ÚNICO PUNTO DE ENTRADA
// ======================================================
export async function crearVenta({
  productos = [],
  total = null,
  telefono = "",
  direccion = "",
  metodo = "Efectivo",
  entrega = "Retiro",
  notas = ""
}) {
  try {
    const lista = asegurarArray(productos).map(p => ({
      nombre: asegurarString(p.nombre),
      precio: num(p.precio),
      imagen: asegurarString(p.imagen || "")
    }));

    const totalFinal = total !== null ? num(total) : calcularTotal(lista);

    const telefonoLimpio = limpiarTelefono(telefono);

    // ✅ VALIDACIONES IMPORTANTES
    if (lista.length === 0) {
      alert("⚠️ No hay productos en el pedido.");
      return null;
    }

    // Si es envío, dirección obligatoria
    const entregaFinal = asegurarString(entrega) || "Retiro";
    if (entregaFinal.toLowerCase().includes("env") && !asegurarString(direccion)) {
      alert("⚠️ Falta dirección para envío.");
      return null;
    }

    const payload = {
      productos: lista,
      total: totalFinal,

      // datos del cliente
      telefono: telefonoLimpio,
      direccion: asegurarString(direccion),
      metodo: asegurarString(metodo) || "Efectivo",
      entrega: entregaFinal,

      notas: asegurarString(notas),

      // estado del pedido
      estado: "Pendiente",

      // fecha pro
      timestamp: serverTimestamp(),

      // extra útil
      createdAtISO: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "ventas"), payload);
    console.log("✅ Pedido creado con ID:", docRef.id);
    return docRef.id;

  } catch (err) {
    console.error("❌ Error creando pedido:", err);
    alert("Error al crear pedido: " + (err.message || err));
    return null;
  }
}


// ======================================================
// 🔥 PEDIDOS EN TIEMPO REAL PARA ADMIN
// ======================================================
export function cargarVentasEnTiempoReal(callback) {
  try {
    const q = query(collection(db, "ventas"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snap) => {
      const ventas = [];
      snap.forEach((docu) => {
        ventas.push({
          id: docu.id,
          ...docu.data()
        });
      });

      callback(ventas);
    });
  } catch (err) {
    console.error("❌ Error escuchando ventas realtime:", err);
  }
}


// ======================================================
// ✅ ACTUALIZAR ESTADO PEDIDO (ADMIN)
// ======================================================
export async function actualizarEstadoVenta(id, nuevoEstado) {
  try {
    if (!id) return;
    const refVenta = doc(db, "ventas", id);

    await updateDoc(refVenta, {
      estado: nuevoEstado
    });

    console.log("✅ Estado actualizado:", id, "->", nuevoEstado);
  } catch (err) {
    console.error("❌ Error actualizando estado:", err);
    alert("Error al actualizar estado: " + (err.message || err));
  }
}
