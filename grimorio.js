// ==========================================
// GRIMORIO.JS - SISTEMA DE SELLOS MÍSTICOS (PROTEGIDO)
// ==========================================

auth.onAuthStateChanged(user => {
    if (user) {
        usuarioActual = user;
        cargarSlotsSantuario();
        const btnImportar = document.getElementById('btn-copiar-id');
        if (btnImportar) btnImportar.onclick = copiarMazoPorID;
    }
});

// 1. CARGAR DATOS
async function cargarSlotsSantuario() {
    if (!usuarioActual) return;
    try {
        const slotsRef = db.collection('usuarios').doc(usuarioActual.uid).collection('slots');
        const querySnapshot = await slotsRef.get();
        const gridCopias = document.getElementById('grid-mazos-copiados');
        const seccionCopias = document.getElementById('seccion-copias');
        if (gridCopias) gridCopias.innerHTML = ""; 

        const slotsIDsFijos = ['mazo1', 'mazo2', 'mazo3', 'carpeta1', 'carpeta2', 'carpeta3'];
        let contadorCopias = 0;

        querySnapshot.forEach(doc => {
            if (slotsIDsFijos.includes(doc.id)) {
                actualizarVisualSlot(doc.id, doc.data());
            } else if (doc.id.startsWith('copia_')) {
                contadorCopias++;
                inyectarSlotCopiado(doc.id, doc.data());
            }
        });
        if (seccionCopias) seccionCopias.style.display = contadorCopias > 0 ? 'block' : 'none';
    } catch (e) { console.error(e); }
}

function actualizarVisualSlot(id, data) {
    const contenedor = document.querySelector(`[data-slot-id="${id}"]`);
    if (!contenedor) return;
    const nombreTxt = contenedor.querySelector('.slot-name');
    if (nombreTxt) nombreTxt.innerText = (data.nombre || getDefaultName(id)).toUpperCase();
    const contadorTxt = contenedor.querySelector('.slot-count');
    if (contadorTxt) {
        const total = data.cartas ? data.cartas.reduce((acc, item) => acc + item.cant, 0) : 0;
        contadorTxt.innerText = `${total} CARTAS`;
    }
}

function inyectarSlotCopiado(id, data) {
    const grid = document.getElementById('grid-mazos-copiados');
    if (!grid) return;
    const total = data.cartas ? data.cartas.reduce((acc, item) => acc + item.cant, 0) : 0;
    const div = document.createElement('div');
    
    // Unificamos clase para que use el estilo de los mazos originales
    div.className = 'slot-item item-copiado'; 
    div.innerHTML = `
        <div class="slot-info">
            <span class="slot-name" style="color:#3b82f6">${data.nombre.toUpperCase()}</span>
            <span class="slot-count">${total} CARTAS</span>
        </div>
        <div class="slot-controls">
            <button class="btn-slot-icon" onclick="copiarIDAlPortapapeles('${id}', this)" title="Re-compartir Sello">🔗</button>
            <button class="btn-slot-icon btn-del" onclick="borrarCopia('${id}')" title="Desterrar">🗑️</button>
            <button class="btn-slot-open" onclick="irAConstructor('${id}')">GESTIONAR</button>
        </div>`;
    grid.appendChild(div);
}

// 2. ACCIÓN: COMPARTIR
function copiarIDAlPortapapeles(id, el) {
    if (!usuarioActual) return;
    
    const prefijo = usuarioActual.uid.substring(0, 4).toUpperCase();
    const tipo = id.includes('mazo') ? 'M' : 'C';
    const num = id.match(/\d+/) || "1";
    const selloBonito = `${prefijo}-${tipo}${num}`;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(selloBonito).then(() => {
            ejecutarFeedbackCopiado(el, selloBonito);
        }).catch(err => {
            console.warn("Falla Clipboard API, usando fallback...");
            copiarMetodoFallback(selloBonito, el);
        });
    } else {
        copiarMetodoFallback(selloBonito, el);
    }
}

function copiarMetodoFallback(texto, el) {
    const textArea = document.createElement("textarea");
    textArea.value = texto;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            ejecutarFeedbackCopiado(el, texto);
        } else {
            alert("No se pudo copiar el sello: " + texto);
        }
    } catch (err) {
        console.error("Error en fallback:", err);
    }
    document.body.removeChild(textArea);
}

function ejecutarFeedbackCopiado(el, sello) {
    mostrarNotificacion(`📜 SELLO [${sello}] COPIADO`, "✨");
    const iconoOriginal = el.innerText;
    el.innerText = "✅";
    setTimeout(() => { el.innerText = iconoOriginal; }, 2000);
}

// 3. ACCIÓN: IMPORTAR (CON LÍMITE DE 6)
async function copiarMazoPorID() {
    const input = document.getElementById('input-copiar-id');
    const btn = document.getElementById('btn-copiar-id'); 
    let sello = input ? input.value.trim().toUpperCase() : "";
    
    if (!sello || !sello.includes('-')) {
        mostrarNotificacion("Sello inválido. Ejemplo: 9XKG-M1", "⚠️");
        return;
    }

    const miPrefijo = usuarioActual.uid.substring(0, 4).toUpperCase();
    const [prefijoAmigo, codigoMazo] = sello.split('-');

    if (prefijoAmigo === miPrefijo) {
        mostrarNotificacion("No puedes copiar tu propia estrategia.", "🚫");
        if (input) input.value = "";
        return;
    }

    try {
        // --- VALIDACIÓN DE LÍMITE DE 6 MAZOS ADQUIRIDOS ---
        const slotsRef = db.collection('usuarios').doc(usuarioActual.uid).collection('slots');
        const querySnapshot = await slotsRef.get();
        let totalCopias = 0;
        querySnapshot.forEach(doc => { if (doc.id.startsWith('copia_')) totalCopias++; });

        if (totalCopias >= 6) {
            mostrarNotificacion("Límite alcanzado (máx 6 estrategias).", "🚫");
            return;
        }

        mostrarNotificacion("Buscando Sello en el Reino...", "⏳");
        const idBuscado = codigoMazo.replace('M', 'mazo').replace('C', 'carpeta').toLowerCase();

        const usuariosRef = db.collection('usuarios');
        const snapshot = await usuariosRef.get();
        
        let uidEncontrado = null;
        snapshot.forEach(userDoc => {
            if (userDoc.id.toUpperCase().startsWith(prefijoAmigo)) {
                uidEncontrado = userDoc.id;
            }
        });

        if (!uidEncontrado) {
            mostrarNotificacion("El invocador no existe.", "❌");
            return;
        }

        const docAjeno = await db.collection('usuarios').doc(uidEncontrado)
                                 .collection('slots').doc(idBuscado).get();

        if (!docAjeno.exists) {
            mostrarNotificacion("El mazo se ha desvanecido.", "❌");
            return;
        }

        const dataAjena = docAjeno.data();
        const perfilAjeno = await db.collection('usuarios').doc(uidEncontrado).get();
        const nickDueno = perfilAjeno.exists ? (perfilAjeno.data().nickname || "Invocador") : "Anónimo";

        const nombreFinal = `COPIA: ${dataAjena.nombre} (${nickDueno})`.toUpperCase();
        const nuevoSlotId = "copia_" + Date.now();

        await db.collection('usuarios').doc(usuarioActual.uid)
                .collection('slots').doc(nuevoSlotId).set({
            nombre: nombreFinal,
            cartas: dataAjena.cartas || [],
            config: dataAjena.config || {},
            esCopia: true,
            autorOriginal: nickDueno,
            fechaCopia: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarNotificacion("✨ ¡ESTRATEGIA HEREDADA!", "✨");
        if (btn) btn.innerText = "MAZO COPIADO";
        if (input) input.value = "";
        setTimeout(() => { location.reload(); }, 1500);

    } catch (e) {
        console.error(e);
        mostrarNotificacion("Error de conexión astral.", "❌");
    }
}

// GESTIÓN
async function borrarCopia(id) {
    if (!confirm("¿Desterrar mazo?")) return;
    try {
        await db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(id).delete();
        mostrarNotificacion("Mazo desterrado.", "🗑️");
        cargarSlotsSantuario();
    } catch (e) { console.error(e); }
}

async function renombrarSlot(id) {
    const nuevo = prompt("Nuevo nombre:");
    if (!nuevo) return;
    try {
        await db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(id).set({
            nombre: nuevo.toUpperCase()
        }, { merge: true });
        cargarSlotsSantuario();
    } catch (e) { console.error(e); }
}

async function limpiarSlot(id) {
    if (!confirm("¿Vaciar registro?")) return;
    try {
        await db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(id).set({
            cartas: [], nombre: getDefaultName(id)
        }, { merge: true });
        cargarSlotsSantuario();
    } catch (e) { console.error(e); }
}

function getDefaultName(id) {
    const nombres = { 'mazo1': "MAZO DE GUERRA 1", 'mazo2': "MAZO DE GUERRA 2", 'mazo3': "MAZO DE GUERRA 3", 'carpeta1': "CARTAS PARA VENTA", 'carpeta2': "COLECCIÓN PERSONAL", 'carpeta3': "BUSCADAS / TRADE" };
    return nombres[id] || "REGISTRO";
}

function irAConstructor(id) { window.location.href = `constructor.html?slot=${id}`; }