// ==========================================
// 1. VARIABLES DE ESTADO Y REGLAS
// ==========================================
const BLOQUES = {
    "primera-era": [
        "El_Reto", "Espiritu_de_Dragon", "La_ira_del_nahual", "Mundo_Gotico", "Ragnarok",
        "Espada_Sagrada", "Cruzadas", "Aniversario_Espada_Sagrada",
        "Helenica", "Imperio", "Aniversario_Helenica",
        "Hijos_de_Daana", "Tierras_Altas", "Aniversario_Hijos_de_Daana",
        "Dominios_de_Ra", "Encrucijada", "Aniversario_Dominios_de_Ra"
    ],
    "segunda-era": ["Espada_Sagrada", "Helenica", "Hijos_de_Daana", "Dominios_de_Ra"],
    "primer_bloque": ["Espada_Sagrada", "Cruzadas", "Aniversario_Espada_Sagrada", "Helenica", "Imperio", "Aniversario_Helenica", "Hijos_de_Daana", "Tierras_Altas", "Dominios_de_Ra", "Encrucijada"]
};

let mazoActual = [];
let slotId = "";
let esMazo = false;
let faseOroInicial = true;
let configMazo = { bloque: "", formato: "", raza: "" };

// ==========================================
// 2. INICIO Y CARGA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    slotId = params.get('slot');

    if (!slotId) {
        window.location.href = 'grimorio.html';
        return;
    }

    esMazo = slotId.includes('mazo') || slotId.startsWith('copia_');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioActual = user;
            await cargarDatosDelSlot();
            verificarYRenderizar();
        } else {
            window.location.href = 'index.html';
        }
    });

    document.getElementById('main-search')?.addEventListener('input', () => filtrarCartas());
});

async function cargarDatosDelSlot() {
    try {
        const doc = await db.collection('usuarios').doc(usuarioActual.uid)
            .collection('slots').doc(slotId).get();

        if (doc.exists) {
            const data = doc.data();
            mazoActual = data.cartas || [];
            configMazo = data.config || { bloque: "", formato: "", raza: "" };

            const displayNombre = document.getElementById('slot-id-display');
            if (displayNombre) {
                const nombreLimpio = (data.nombre || "ESTRATEGIA").replace("COPIA:", "").trim().toUpperCase();
                if (slotId.startsWith('copia_')) {
                    const autor = (data.autorOriginal || "INVOCADOR").toUpperCase();
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span> | DE: ${autor}`;
                } else {
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span>`;
                }
            }

            setearValoresInterfaz();

            if (mazoActual.length > 0 || slotId.startsWith('copia_')) {
                liberarVistaMazoExistente();
            } else {
                actualizarSetup(true);
            }
        }
        renderizarMazo();
    } catch (e) {
        console.error("Error en conexión astral:", e);
    }
}

function verificarYRenderizar() {
    const reintento = setInterval(() => {
        if (typeof cartasMyL !== 'undefined' && cartasMyL.length > 0) {
            clearInterval(reintento);
            filtrarCartas();
            renderizarMazo();
        }
    }, 500);
}

// ==========================================
// 3. FLUJO DE REGLAS (CORRECCIÓN DE BLOQUEO)
// ==========================================
function actualizarSetup(esCargaInicial = false) {
    const selBloque = document.getElementById('select-bloque');
    const selFormato = document.getElementById('select-formato');
    const selRaza = document.getElementById('select-raza');
    const overlay = document.getElementById('lock-overlay');
    const sidebar = document.getElementById('sidebar');

    if (!selBloque) return;

    if (!esCargaInicial && event && event.target.id === 'select-bloque') {
        selFormato.value = "";
        selRaza.value = "";
        configMazo.formato = "";
        configMazo.raza = "";
    }

    configMazo.bloque = selBloque.value;
    configMazo.formato = selFormato.value;
    configMazo.raza = selRaza.value;

    if (configMazo.bloque !== "") {
        selFormato.style.display = "inline-block";
    } else {
        selFormato.style.display = "none";
        selRaza.style.display = "none";
        bloquearSelectores(false);
        return;
    }

    if (configMazo.formato !== "") {
        if (configMazo.formato.includes('racial')) {
            selRaza.style.display = "inline-block";
        } else {
            selRaza.style.display = "none";
            configMazo.raza = "";
        }
    } else {
        selRaza.style.display = "none";
        return;
    }

    const requiereRaza = configMazo.formato.includes('racial');
    const bloqueOK = configMazo.bloque !== "";
    const formatoOK = configMazo.formato !== "";
    const razaOK = requiereRaza ? configMazo.raza !== "" : true;

    if (bloqueOK && formatoOK && razaOK) {
        bloquearSelectores(true);
        if (overlay) overlay.classList.add('unlocked');
        
        const tieneOroIni = mazoActual.some(item => {
            const c = cartasMyL.find(x => x.ID === item.id);
            return c && c.Tipo.toLowerCase().includes('oro') && (c.Habilidad || "").length < 30;
        });
        faseOroInicial = !tieneOroIni;

        if (!faseOroInicial && sidebar) {
             actualizarFiltrosSidebar();
        }
        
        filtrarCartas();
    } else {
        if (overlay) overlay.classList.remove('unlocked');
        if (sidebar) sidebar.style.display = "none";
    }
}

function bloquearSelectores(bloquear) {
    const contenedor = document.getElementById('setup-mazo');
    const instruction = document.getElementById('setup-instruction');
    const selectores = contenedor.querySelectorAll('select');
    const controlsRow = contenedor.querySelector('.setup-controls-row');
    const oldBtn = document.getElementById('btn-reset-rules');
    const oldResumen = document.getElementById('resumen-reglas');

    if (oldBtn) oldBtn.remove();
    if (oldResumen) oldResumen.remove();

    if (bloquear) {
        selectores.forEach(sel => sel.style.display = 'none');
        if (instruction) instruction.innerText = "SELLO DEL REINO ROTO - CARTAS LIBERADAS";

        const resumen = document.createElement('span');
        resumen.id = 'resumen-reglas';
        const txtBloque = configMazo.bloque.replace(/-/g, ' ');
        const txtRaza = configMazo.raza ? ` | ${configMazo.raza}` : '';
        resumen.innerText = `${txtBloque} | ${configMazo.formato}${txtRaza}`;
        resumen.className = "resumen-reglas-estilo";
        if (controlsRow) controlsRow.appendChild(resumen);

        const btnReset = document.createElement('button');
        btnReset.id = 'btn-reset-rules';
        btnReset.innerHTML = '<span>🔄</span> CAMBIAR REGLAS';
        btnReset.className = 'btn-cambiar-reglas';
        btnReset.onclick = resetearReglas;
        if (controlsRow) controlsRow.appendChild(btnReset);
    } else {
        if (instruction) instruction.innerText = "ESTABLECE LAS REGLAS DEL REINO PARA DESBLOQUEAR EL GRIMORIO";
        const b = document.getElementById('select-bloque');
        if (b) b.style.display = 'inline-block';
    }
}

function resetearReglas() {
    if (mazoActual.length > 0) {
        if (!confirm("Si cambias las reglas podrías invalidar las cartas ya elegidas. ¿Continuar?")) return;
    }
    configMazo = { bloque: "", formato: "", raza: "" };
    mazoActual = [];
    faseOroInicial = true;
    document.getElementById('select-bloque').value = "";
    document.getElementById('select-formato').value = "";
    document.getElementById('select-raza').value = "";
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.display = "none";
        sidebar.classList.add('sidebar-hidden');
    }
    bloquearSelectores(false);
    actualizarSetup(false);
    renderizarMazo();
}

// ==========================================
// 4. FILTRADO
// ==========================================
function filtrarCartas() {
    const display = document.getElementById('card-display');
    const sidebar = document.getElementById('sidebar');
    if (!display || !cartasMyL || !configMazo.bloque) return;

    const edicionesPermitidas = BLOQUES[configMazo.bloque] || [];
    
    let fuente = cartasMyL.filter(c => {
        const edicionNorm = (c.Carpeta_Edicion || "").trim();
        return edicionesPermitidas.includes(edicionNorm);
    });

    if (faseOroInicial) {
        if (sidebar) sidebar.style.display = "none";
        
        fuente = fuente.filter(c => {
            const tipo = (c.Tipo || "").toLowerCase();
            const habilidad = (c.Habilidad || "").trim().toLowerCase();
            const esOro = tipo.includes('oro');
            const sinHabilidadReal = habilidad === "" || habilidad === "-" || habilidad === "sin habilidad" || habilidad.length < 15;
            return esOro && sinHabilidadReal;
        });
        
        if (fuente.length === 0) {
            display.innerHTML = `<div class="lock-message" style="position:static; color: #ff6666; border:none;">NO SE ENCONTRARON OROS INICIALES LEGALES EN ESTE BLOQUE.</div>`;
            return;
        }
        mostrarNotificacion("ETAPA 1: ELIGE TU ORO INICIAL", "👑");
    } else {
        // Si no es fase oro inicial, dejamos que filtros-constructor.js maneje la visibilidad y lógica avanzada
        if (typeof filtrarCartasSidebar === 'function') {
            return filtrarCartasSidebar(); 
        }

        const busqueda = (document.getElementById('main-search')?.value || "").toLowerCase();
        const tipoFiltro = document.querySelector('input[name="tipo_carta"]:checked')?.value;
        
        fuente = fuente.filter(c => {
            if (configMazo.formato.includes('racial') && (c.Tipo || "").toLowerCase().includes('aliado')) {
                if (c.Raza !== configMazo.raza) return false;
            }
            if (tipoFiltro && !(c.Tipo || "").toLowerCase().includes(tipoFiltro.toLowerCase())) return false;
            const nombre = (c.Nombre || "").toLowerCase();
            const hab = (c.Habilidad || "").toLowerCase();
            return nombre.includes(busqueda) || hab.includes(busqueda);
        });
    }
    dibujarCartasConstructor(fuente);
}

function obtenerRutaImagen(c) {
    const bloque = (c.Bloque || "").trim();
    const edicion = (c.Carpeta_Edicion || "").trim();
    const imagen = (c.Imagen || "").trim();

    if (bloque === "primer_bloque") {
        let padre = "";
        if (edicion.includes("Espada_Sagrada") || edicion === "Cruzadas") padre = "Espada_Sagrada";
        else if (edicion.includes("Helenica") || edicion === "Imperio") padre = "Helenica";
        else if (edicion.includes("Hijos_de_Daana") || edicion === "Tierras_Altas") padre = "Hijos_de_Daana";
        else if (edicion.includes("Dominios_de_Ra") || edicion === "Encrucijada") padre = "Dominios_de_Ra";

        if (padre) {
            return padre === edicion ? `img/cartas/${bloque}/${padre}/${imagen}` : `img/cartas/${bloque}/${padre}/${edicion}/${imagen}`;
        }
    }
    return `img/cartas/${bloque}/${edicion}/${imagen}`;
}

function dibujarCartasConstructor(lista) {
    const display = document.getElementById('card-display');
    if (!display) return;
    display.innerHTML = "";
    lista.forEach(c => {
        const rutaImg = obtenerRutaImagen(c);
        const div = document.createElement('div');
        div.className = "card-item";
        div.innerHTML = `<img src="${rutaImg}" alt="${c.Nombre}" loading="lazy" onerror="this.src='img/placeholder.png'">`;
        div.onclick = () => añadirCarta(c.ID);
        display.appendChild(div);
    });
}

// ==========================================
// 5. ACCIONES
// ==========================================
function añadirCarta(id) {
    const carta = cartasMyL.find(c => c.ID === id);
    if (!carta) return;

    if (faseOroInicial) {
        mazoActual.push({ id: id, cant: 1, favorito: false });
        faseOroInicial = false;

        // ACTIVAR SIDEBAR DINÁMICA
        if (typeof actualizarFiltrosSidebar === 'function') {
            actualizarFiltrosSidebar();
        }
        
        mostrarNotificacion("ORO INICIAL REGISTRADO. BUSCADOR LIBERADO.", "⚔️");
        filtrarCartas();
    } else {
        const totalCastilloActual = mazoActual.reduce((acc, item) => {
            const infoC = cartasMyL.find(c => c.ID === item.id);
            if (!infoC) return acc;
            const textoHab = (infoC.Habilidad || "").trim();
            const esOroBasico = infoC.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;
            
            // Regla 49+1: No contamos el primer oro básico (el inicial)
            let esEsteElInicial = false;
            if (esOroBasico && mazoActual[0].id === item.id) esEsteElInicial = true;

            return acc + (esEsteElInicial ? (item.cant - 1) : item.cant);
        }, 0);

        if (totalCastilloActual >= 49) {
            mostrarNotificacion("ESTRATEGIA COMPLETA (49 + 1 CARTAS).", "✅");
            return;
        }

        const itemEnMazo = mazoActual.find(item => item.id === id);
        if (itemEnMazo) {
            const hab = (carta.Habilidad || "").toLowerCase();
            if (hab.includes("única") || hab.includes("unica")) {
                mostrarNotificacion("ESTA CARTA ES ÚNICA.", "⚠️");
                return;
            }
            const tipoLower = (carta.Tipo || "").toLowerCase();
            if (!hab.includes("mercenario") && !tipoLower.includes("oro") && itemEnMazo.cant >= 3) {
                mostrarNotificacion("MÁXIMO 3 COPIAS POR CARTA.", "⚠️");
                return;
            }
            itemEnMazo.cant++;
        } else {
            mazoActual.push({ id: id, cant: 1, favorito: false });
        }
    }
    renderizarMazo();
}

function renderizarMazo() {
    const container = document.getElementById('deck-list-container');
    if (!container) return;
    container.innerHTML = "";

    let totalCastillo = 0;
    let tieneOroIni = false;
    let nombreOroIni = "FALTA";
    let countAliados = 0, countOrosMazo = 0, countOtros = 0;
    let costes = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    let sumaFuerza = 0, cuentaFuerza = 0;
    let razasMap = {};
    let motorRobo = 0, motorAnula = 0;

    mazoActual.forEach((item) => {
        const info = cartasMyL.find(c => c.ID === item.id);
        if (!info) return;

        const textoHabilidad = (info.Habilidad || "").trim();
        const habLower = textoHabilidad.toLowerCase();
        const tipo = (info.Tipo || "").toLowerCase();
        const esOro = tipo.includes('oro');

        for (let i = 0; i < item.cant; i++) {
            if (esOro && !tieneOroIni && textoHabilidad.length < 30) {
                tieneOroIni = true;
                nombreOroIni = info.Nombre;
            } else {
                totalCastillo++;
                if (tipo.includes('aliado')) {
                    countAliados++;
                    sumaFuerza += (parseInt(info.Fuerza) || 0);
                    cuentaFuerza++;
                    if (info.Raza) {
                        const r = info.Raza.trim();
                        razasMap[r] = (razasMap[r] || 0) + 1;
                    }
                } else if (esOro) {
                    countOrosMazo++;
                } else {
                    countOtros++;
                }
                if (habLower.includes("roba") || habLower.includes("busca") || habLower.includes("mira")) motorRobo++;
                if (habLower.includes("anula") || habLower.includes("destruye")) motorAnula++;
                if (!esOro) {
                    let c = parseInt(info.Coste) || 0;
                    if (c > 4) c = 4;
                    costes[c]++;
                }
            }
        }

        const rutaImg = obtenerRutaImagen(info);
        const div = document.createElement('div');
        div.className = "deck-card-item";
        div.innerHTML = `
            <div class="mini-preview" style="background-image: url('${rutaImg}')"></div>
            <span class="deck-card-qty">${item.cant}x</span>
            <div class="deck-card-info"><strong>${info.Nombre}</strong></div>
            <button class="btn-qty-control" onclick="quitarCarta('${info.ID}')">-</button>
        `;
        container.appendChild(div);
    });

    if (document.getElementById('stat-oro-ini')) {
        document.getElementById('stat-oro-ini').innerText = tieneOroIni ? "SÍ" : "NO";
        document.getElementById('stat-oro-ini').style.color = tieneOroIni ? "#f7ef8a" : "#ff6666";
    }

    document.getElementById('total-aliados').innerText = countAliados;
    document.getElementById('total-oros').innerText = countOrosMazo;
    document.getElementById('total-otros').innerText = countOtros;
    document.getElementById('total-cards').innerText = `${totalCastillo} / 49 + 1`;
    document.getElementById('fuerza-promedio').innerText = cuentaFuerza > 0 ? (sumaFuerza / cuentaFuerza).toFixed(1) : "0";
    document.getElementById('stat-robo').innerText = motorRobo;
    document.getElementById('stat-anula').innerText = motorAnula;

    let maxRaza = "NINGUNA", maxVal = 0;
    for (let r in razasMap) { if(razasMap[r] > maxVal) { maxVal = razasMap[r]; maxRaza = r; } }
    document.getElementById('raza-predominante').innerText = maxRaza.toUpperCase();

    for (let i = 0; i <= 4; i++) {
        const barra = document.getElementById(`bar-${i}`);
        if (barra) {
            const porcentaje = totalCastillo > 0 ? (costes[i] / totalCastillo) * 200 : 0;
            barra.style.height = `${Math.min(porcentaje, 100)}%`;
        }
    }

    const oroStatus = document.getElementById('status-oro-inicial');
    if (oroStatus) {
        if (tieneOroIni) {
            oroStatus.innerText = (totalCastillo >= 49) ? "✅ ESTRATEGIA COMPLETA" : `🛡️ ORO INICIAL: ${nombreOroIni}`;
            oroStatus.style.background = "rgba(212, 175, 55, 0.2)";
            oroStatus.style.color = "#f7ef8a";
        } else {
            oroStatus.innerText = "❌ FALTA ORO SIN HABILIDAD";
            oroStatus.style.background = "rgba(255, 0, 0, 0.1)";
            oroStatus.style.color = "#ff6666";
        }
    }
}

function quitarCarta(id) {
    const indice = mazoActual.findIndex(item => item.id === id);
    if (indice > -1) {
        const info = cartasMyL.find(c => c.ID === id);
        if (!info) return;
        const textoHabilidad = (info.Habilidad || "").trim();
        const esOroBasico = info.Tipo.toLowerCase().includes('oro') && textoHabilidad.length < 30;

        if (esOroBasico && !faseOroInicial && mazoActual[indice].cant === 1) {
            faseOroInicial = true;
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.display = "none";
                sidebar.classList.add('sidebar-hidden');
            }
            mostrarNotificacion("ORO INICIAL ELIMINADO. SE REQUIERE UNO NUEVO.", "⚠️");
            filtrarCartas();
        }

        mazoActual[indice].cant--;
        if (mazoActual[indice].cant <= 0) {
            mazoActual.splice(indice, 1);
        }
        renderizarMazo();
    }
}

function setearValoresInterfaz() {
    const b = document.getElementById('select-bloque');
    const f = document.getElementById('select-formato');
    const r = document.getElementById('select-raza');
    if (b) b.value = configMazo.bloque || "";
    if (f) f.value = configMazo.formato || "";
    if (r) r.value = configMazo.raza || "";
}

function liberarVistaMazoExistente() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('lock-overlay');
    
    if (overlay) overlay.classList.add('unlocked');
    bloquearSelectores(true);

    const tieneOroIni = mazoActual.some(item => {
        const c = cartasMyL.find(x => x.ID === item.id);
        const textoHab = (c?.Habilidad || "").trim();
        return c && c.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;
    });

    faseOroInicial = !tieneOroIni;
    
    if (!faseOroInicial) {
        if (typeof actualizarFiltrosSidebar === 'function') {
            actualizarFiltrosSidebar();
        } else if (sidebar) {
            sidebar.style.display = "block";
        }
    }
    filtrarCartas();
}

function mostrarNotificacion(mensaje, icono = "⚠️") {
    let container = document.getElementById('notif-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notif-container';
        container.style.cssText = "position: fixed; bottom: 20px; left: 20px; z-index: 9999; display: flex; flex-direction: column-reverse; gap: 10px;";
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'notificacion-toast';
    toast.innerHTML = `<span>${icono}</span> ${mensaje}`;
    toast.style.cssText = "background: rgba(0,0,0,0.9); color: #fff; padding: 12px 20px; border-radius: 4px; border-left: 4px solid #d4af37; font-family: 'Cinzel', serif; font-size: 0.8rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

async function guardarMazoFirebase() {
    if (!usuarioActual) return mostrarNotificacion("INICIE SESIÓN", "🚫");
    if (mazoActual.length === 0) return mostrarNotificacion("MAZO VACÍO", "⚠️");
    
    try {
        const btn = document.querySelector('.btn-save-deck');
        if (btn) btn.innerText = "GUARDANDO...";
        await db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(slotId).set({
            cartas: mazoActual,
            config: configMazo,
            ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        if (btn) btn.innerText = "GUARDADO";
        mostrarNotificacion("ESTRATEGIA GUARDADA", "⭐");
        setTimeout(() => { if (btn) btn.innerText = "GUARDAR CAMBIOS"; }, 2000);
    } catch (e) {
        mostrarNotificacion("ERROR AL GUARDAR", "❌");
    }
}