// ventas.js
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


/* ======================================================
   🔧 UTILIDADES INTERNAS
====================================================== */

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanString(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function cleanPhone(phone) {
  return cleanString(phone).replace(/\D/g, "");
}

function ensureArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function calcularTotalSeguro(productos) {
  return ensureArray(productos).reduce(
    (acc, p) => acc + toNumber(p.precio),
    0
  );
}

/* ======================================================
   ✅ CREAR VENTA
====================================================== */

export async function crearVenta({
  productos = [],
  total = null,

  nombre = "",
  apellido = "",
  telefono = "",
  direccion = "",

  metodo = "Efectivo",
  entrega = "Retiro"
}) {
  try {
    const listaProductos = ensureArray(productos).map((p) => ({
      nombre: cleanString(p.nombre),
      precio: toNumber(p.precio),
      imagen: cleanString(p.imagen)
    }));

    if (listaProductos.length === 0) {
      alert("⚠️ El pedido no tiene productos.");
      return null;
    }

    const entregaFinal = cleanString(entrega) || "Retiro";
    const direccionFinal = cleanString(direccion);

    if (
      entregaFinal.toLowerCase().includes("env") &&
      !direccionFinal
    ) {
      alert("⚠️ Falta la dirección para el envío.");
      return null;
    }

    const totalFinal =
      total !== null ? toNumber(total) : calcularTotalSeguro(listaProductos);

    const payload = {
      // 👤 CLIENTE
      nombre: cleanString(nombre),
      apellido: cleanString(apellido),
      telefono: cleanPhone(telefono),
      direccion: direccionFinal,

      // 📦 PEDIDO
      productos: listaProductos,
      total: totalFinal,
      metodo: cleanString(metodo) || "Efectivo",
      entrega: entregaFinal,

      // 🔄 ESTADO
      estado: "Pendiente",

      // ⏱️ FECHAS
      timestamp: serverTimestamp(),
      createdAtISO: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "ventas"), payload);
    console.log("✅ Venta creada:", docRef.id);

    return docRef.id;
  } catch (err) {
    console.error("❌ Error creando venta:", err);
    alert("Error al registrar el pedido.");
    return null;
  }
}

/* ======================================================
   🔥 CARGA DE VENTAS EN TIEMPO REAL (ADMIN)
====================================================== */

export function cargarVentasEnTiempoReal(callback) {
  if (typeof callback !== "function") return;

  try {
    const q = query(
      collection(db, "ventas"),
      orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
      const ventas = [];
      snapshot.forEach((docu) => {
        ventas.push({
          id: docu.id,
          ...docu.data()
        });
      });

      callback(ventas);
    });
  } catch (err) {
    console.error("❌ Error escuchando ventas:", err);
  }
}

/* ======================================================
   🔄 ACTUALIZAR ESTADO DE VENTA (ADMIN)
====================================================== */

export async function actualizarEstadoVenta(id, nuevoEstado) {
  if (!id || !nuevoEstado) return;

  try {
    const refVenta = doc(db, "ventas", id);

    await updateDoc(refVenta, {
      estado: cleanString(nuevoEstado)
    });

    console.log("✅ Estado actualizado:", id, "→", nuevoEstado);
  } catch (err) {
    console.error("❌ Error actualizando estado:", err);
    alert("No se pudo actualizar el estado.");
  }
}
