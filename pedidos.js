import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

import { cargarVentasEnTiempoReal, actualizarEstadoVenta } from "./ventas.js";

window.login = function () {
  const email = user.value;
  const passw = pass.value;
  signInWithEmailAndPassword(auth, email, passw);
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    loginBox.style.display = "none";
    pedidosPanel.style.display = "block";

    cargarVentasEnTiempoReal(ventas => {
      pedidosList.innerHTML = ventas.map(v => `
        <div>
          <b>$${v.total}</b> - ${v.estado}
          <button onclick="actualizarEstadoVenta('${v.id}','Preparando')">Aceptar</button>
        </div>
      `).join("");
    });

  } else {
    loginBox.style.display = "block";
    pedidosPanel.style.display = "none";
  }
});
