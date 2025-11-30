// ==========================
// 🔹 MÓDULO DE CONTROL DE VENTAS
// ==========================
import { db } from "./firebase.js";
import { collection, addDoc, query, orderBy, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Guardar venta en Firestore
export async function guardarVenta(metodo, entrega, direccion, telefono, total, productos) {
    try {
        const venta = {
            metodo,
            entrega,
            direccion,
            telefono,
            total,
            productos,
            fechaHora: new Date().toLocaleString('es-AR', { 
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            timestamp: new Date(),
            estado: "Pendiente"
        };
        
        const docRef = await addDoc(collection(db, "ventas"), venta);
        console.log("✅ Venta guardada con ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error al guardar venta:", error);
        alert("Error al procesar la venta. Por favor intenta de nuevo.");
    }
}

// Cargar historial de ventas en tiempo real
export function cargarVentasEnTiempoReal(callback) {
    try {
        const q = query(collection(db, "ventas"), orderBy("timestamp", "desc"));
        
        onSnapshot(q, (snapshot) => {
            let ventas = [];
            snapshot.forEach((doc) => {
                ventas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log("📊 Ventas cargadas:", ventas.length);
            callback(ventas);
        });
    } catch (error) {
        console.error("❌ Error al cargar ventas:", error);
    }
}

// Obtener estadísticas de ventas
export async function obtenerEstadisticas() {
    try {
        const snapshot = await getDocs(collection(db, "ventas"));
        
        let totalVentas = 0;
        let totalGanancias = 0;
        let conteoProductos = {};
        let ventasPorMetodo = {};
        let ventasPorEntrega = {};
        
        snapshot.forEach((doc) => {
            const venta = doc.data();
            totalVentas++;
            totalGanancias += venta.total || 0;
            
            // Contar productos
            if (venta.productos && Array.isArray(venta.productos)) {
                venta.productos.forEach(prod => {
                    conteoProductos[prod.nombre] = (conteoProductos[prod.nombre] || 0) + 1;
                });
            }
            
            // Contar por método de pago
            const metodo = venta.metodo || "No especificado";
            ventasPorMetodo[metodo] = (ventasPorMetodo[metodo] || 0) + 1;
            
            // Contar por tipo de entrega
            const entrega = venta.entrega || "No especificado";
            ventasPorEntrega[entrega] = (ventasPorEntrega[entrega] || 0) + 1;
        });
        
        return {
            totalVentas,
            totalGanancias,
            promedioVenta: totalVentas > 0 ? (totalGanancias / totalVentas).toFixed(2) : 0,
            conteoProductos,
            ventasPorMetodo,
            ventasPorEntrega
        };
    } catch (error) {
        console.error("❌ Error al obtener estadísticas:", error);
        return null;
    }
}

// Actualizar estado de una venta
export async function actualizarEstadoVenta(ventaId, nuevoEstado) {
    try {
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js");
        await updateDoc(doc(db, "ventas", ventaId), {
            estado: nuevoEstado
        });
        console.log(`✅ Venta ${ventaId} actualizada a: ${nuevoEstado}`);
    } catch (error) {
        console.error("❌ Error al actualizar venta:", error);
    }
}
