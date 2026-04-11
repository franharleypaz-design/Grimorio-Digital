// ==========================================
// ALBUM.JS - VERSIÓN DE CARGA GARANTIZADA
// ==========================================

// NOTA: 'usuarioActual' y 'cartasMyL' NO se declaran con "let" aquí 
// porque ya vienen heredadas de app.js. Solo las usamos.

mazoActual = []; 
slotId = "";
mostrandoSoloFavoritos = false;
mostrandoSoloCarpeta = true; 

// 1. INICIO
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    slotId = params.get('slot');

    if (!slotId) {
        window.location.href = 'grimorio.html';
        return;
    }

    // Esperamos el estado de autenticación gestionado por app.js
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioActual = user;
            console.log("👤 Sesión vinculada en Álbum:", user.email);
            
            // Paso A: Traer datos de Firebase e inmediatamente actualizar el header
            await cargarDatosDelSlot();

            // Paso B: Esperar al JSON global y RENDERIZAR
            verificarYRenderizar();
        } else {
            window.location.href = 'index.html';
        }
    });

    document.getElementById('main-search')?.addEventListener('input', () => filtrarCartas());
    
    // Listeners para filtros adicionales
    document.getElementById('tipo-filter')?.addEventListener('change', () => filtrarCartas());
    document.getElementById('raza-filter')?.addEventListener('change', () => filtrarCartas());
});

// 2. VERIFICADOR DE DATOS
function verificarYRenderizar() {
    const reintento = setInterval(() => {
        if (typeof cartasMyL !== 'undefined' && cartasMyL.length > 0) {
            clearInterval(reintento);
            console.log("✅ Catálogo detectado:", cartasMyL.length, "registros.");
            
            actualizarEstiloBotonesExhibicion();
            filtrarCartas();
            renderizarMazo(); 
        } else {
            console.log("⏳ Esperando a que app.js cargue el catálogo...");
        }
    }, 500);
}

// 3. CARGA DESDE FIREBASE
async function cargarDatosDelSlot() {
    try {
        const uid = auth.currentUser ? auth.currentUser.uid : usuarioActual.uid;
        const doc = await db.collection('usuarios').doc(uid)
                       .collection('slots').doc(slotId).get();
        
        if (doc.exists) {
            const data = doc.data();
            mazoActual = data.cartas || [];
            console.log("📂 Datos de slot recuperados:", mazoActual.length, "cartas.");

            // --- ACTUALIZACIÓN DINÁMICA DEL HEADER (SINCRONIZACIÓN RÁPIDA) ---
            const displayNombre = document.getElementById('slot-id-display');
            if (displayNombre) {
                const nombreLimpio = (data.nombre || slotId).replace("COPIA:", "").trim().toUpperCase();
                
                if (slotId.startsWith('copia_')) {
                    const autor = (data.autorOriginal || "INVOCADOR").toUpperCase();
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span> | DE: ${autor}`;
                } else {
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span>`;
                }
            }
        }
    } catch (e) {
        console.error("❌ Error al leer Firebase:", e);
    }
}

// 4. FILTRADO (NORMALIZADO)
function filtrarCartas() {
    const display = document.getElementById('card-display');
    if (!display || typeof cartasMyL === 'undefined' || cartasMyL.length === 0) return;

    const busqueda = document.getElementById('main-search')?.value.toLowerCase() || "";
    const tipoFiltro = document.getElementById('tipo-filter')?.value || "";
    const razaFiltro = document.getElementById('raza-filter')?.value || "";

    let fuenteDeCartas = [];

    // Prioridad de filtros de vista
    if (mostrandoSoloFavoritos) {
        const idsFavs = mazoActual.filter(m => m.favorito).map(item => String(item.id).toUpperCase().trim());
        fuenteDeCartas = cartasMyL.filter(carta => idsFavs.includes(String(carta.ID).toUpperCase().trim()));
    } else if (mostrandoSoloCarpeta) {
        const idsGuardados = mazoActual.map(item => String(item.id).toUpperCase().trim());
        fuenteDeCartas = cartasMyL.filter(carta => idsGuardados.includes(String(carta.ID).toUpperCase().trim()));
    } else {
        fuenteDeCartas = cartasMyL;
    }

    const resultados = fuenteDeCartas.filter(c => {
        const matchTexto = c.Nombre.toLowerCase().includes(busqueda) || 
                          (c.Habilidad && c.Habilidad.toLowerCase().includes(busqueda));
        const matchTipo = tipoFiltro === "" || c.Tipo.includes(tipoFiltro);
        const matchRaza = razaFiltro === "" || (c.Raza && c.Raza === razaFiltro);
        return matchTexto && matchTipo && matchRaza;
    });

    dibujarCartasAlbum(resultados);
}

function dibujarCartasAlbum(lista) {
    const display = document.getElementById('card-display');
    if (!display) return;
    display.innerHTML = "";

    if (lista.length === 0) {
        display.innerHTML = `<div style="color: #d4af37; padding: 50px; text-align: center; font-family: 'Cinzel'; grid-column: span 4;">No hay registros para mostrar en esta vista.</div>`;
        return;
    }

    lista.forEach(c => {
        const rutaImg = `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`;
        const div = document.createElement('div');
        div.className = "card-item";
        div.innerHTML = `<div class="card-img-container"><img src="${rutaImg}" alt="${c.Nombre}" loading="lazy"></div>`;
        div.onclick = () => añadirCarta(c.ID);
        display.appendChild(div);
    });
}

// 5. RENDER LISTA DERECHA (CONTENIDO)
function renderizarMazo() {
    const container = document.getElementById('deck-list-container');
    if (!container) return;
    container.innerHTML = "";

    let tTotal = 0;
    mazoActual.forEach(item => {
        const info = cartasMyL.find(c => String(c.ID).toUpperCase().trim() === String(item.id).toUpperCase().trim());
        if (!info) return;

        tTotal += item.cant;
        const div = document.createElement('div');
        div.className = `deck-card-item ${item.favorito ? 'is-fav' : ''}`;
        div.innerHTML = `
            <span class="deck-card-qty">${item.cant}x</span>
            <div class="deck-card-info">
                <strong>${info.Nombre.toUpperCase()}</strong>
                <small>${info.Tipo.toUpperCase()}</small>
            </div>
            <div class="deck-card-controls">
                <button class="btn-fav-toggle ${item.favorito ? 'is-fav' : ''}" onclick="toggleFavorito('${item.id}', event)">${item.favorito ? '⭐' : '☆'}</button>
                <button class="btn-qty-control" onclick="quitarCarta('${info.ID}', event)"> - </button>
                <button class="btn-qty-control" onclick="añadirCarta('${info.ID}', event)"> + </button>
            </div>
        `;
        container.appendChild(div);
    });

    const elTotal = document.getElementById('total-cards-album');
    if (elTotal) elTotal.innerText = tTotal;
}

// ACCIONES
function añadirCarta(id, ev = null) {
    if (ev) ev.stopPropagation();
    const idU = String(id).toUpperCase().trim();
    const i = mazoActual.findIndex(m => String(m.id).toUpperCase().trim() === idU);
    if (i > -1) mazoActual[i].cant++;
    else mazoActual.push({ id: id, cant: 1, favorito: false });
    renderizarMazo();
    if (mostrandoSoloCarpeta || mostrandoSoloFavoritos) filtrarCartas();
}

function quitarCarta(id, ev = null) {
    if (ev) ev.stopPropagation();
    const idU = String(id).toUpperCase().trim();
    const i = mazoActual.findIndex(m => String(m.id).toUpperCase().trim() === idU);
    if (i > -1) {
        mazoActual[i].cant--;
        if (mazoActual[i].cant <= 0) mazoActual.splice(i, 1);
    }
    renderizarMazo();
    if (mostrandoSoloCarpeta || mostrandoSoloFavoritos) filtrarCartas();
}

function toggleFavorito(id, ev = null) {
    if (ev) ev.stopPropagation();
    const idU = String(id).toUpperCase().trim();
    const i = mazoActual.findIndex(m => String(m.id).toUpperCase().trim() === idU);
    if (i > -1) {
        mazoActual[i].favorito = !mazoActual[i].favorito;
        renderizarMazo();
        if (mostrandoSoloFavoritos) filtrarCartas();
    }
}

// LÓGICA DE EXPOSICIÓN EXCLUSIVA
function toggleMostrarCarpeta() {
    if (mostrandoSoloCarpeta && !mostrandoSoloFavoritos) {
        mostrandoSoloCarpeta = false; // Cambia a "Ver todo el juego"
    } else {
        mostrandoSoloCarpeta = true;
        mostrandoSoloFavoritos = false;
    }
    actualizarEstiloBotonesExhibicion();
    filtrarCartas();
}

function toggleMostrarFavoritos() {
    if (mostrandoSoloFavoritos) {
        mostrandoSoloFavoritos = false;
        mostrandoSoloCarpeta = true; // Vuelve a la carpeta
    } else {
        mostrandoSoloFavoritos = true;
        mostrandoSoloCarpeta = true; // Forzamos carpeta para ver favoritos guardados
    }
    actualizarEstiloBotonesExhibicion();
    filtrarCartas();
}

function actualizarEstiloBotonesExhibicion() {
    const btnOwned = document.getElementById('btn-show-owned');
    const btnFavs = document.getElementById('btn-show-favs');
    
    if (btnOwned) {
        // Solo brilla si estamos en carpeta Y NO en favoritos
        btnOwned.classList.toggle('active-filter', (mostrandoSoloCarpeta && !mostrandoSoloFavoritos));
        btnOwned.innerHTML = mostrandoSoloCarpeta ? "🗂️ VER MI CARPETA" : "🌐 VER TODO EL JUEGO";
    }
    
    if (btnFavs) {
        btnFavs.classList.toggle('active-filter', mostrandoSoloFavoritos);
    }
}

async function guardarMazoFirebase() {
    if (!usuarioActual || !slotId) return;
    try {
        await db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(slotId).set({
            cartas: mazoActual,
            ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("Álbum guardado con éxito.", "🗂️");
        } else {
            alert("Álbum guardado.");
        }
    } catch (e) { console.error("❌ Error al guardar:", e); }
}