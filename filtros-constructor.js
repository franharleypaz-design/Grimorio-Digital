/**
 * SISTEMA DE FILTRADO DINÁMICO Y GESTIÓN DE VISTAS
 */

function actualizarFiltrosSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // --- CORRECCIÓN CRÍTICA: VALIDACIÓN DE REGLAS ---
    // Solo actuamos si el bloque, formato y (si es racial) la raza están elegidos.
    const requiereRaza = configMazo.formato.includes('racial');
    const reglasCompletas = configMazo.bloque !== "" && 
                             configMazo.formato !== "" && 
                             (requiereRaza ? configMazo.raza !== "" : true);

    if (!reglasCompletas) {
        sidebar.style.display = "none";
        sidebar.classList.add('sidebar-hidden');
        return; 
    }

    // 1. Validar si falta el Oro Inicial físicamente en el mazo
    const tieneOroIni = mazoActual.some(item => {
        const c = (window.cartasMyL || cartasMyL).find(x => x.ID === item.id);
        return c && c.Tipo.toLowerCase().includes('oro') && (c.Habilidad || "").length < 30;
    });

    faseOroInicial = !tieneOroIni;

    // 2. Si falta el oro inicial, ocultamos sidebar y forzamos el filtrado de Oros Básicos
    if (faseOroInicial) {
        sidebar.style.display = "none";
        sidebar.classList.add('sidebar-hidden');
        filtrarCartas(); 
        // Solo lanzamos la notificación si ya están las reglas puestas
        mostrarNotificacion("ELIGE TU ORO INICIAL", "👑");
        return;
    }

    // 3. Si ya hay oro inicial y reglas, mostrar y limpiar Sidebar
    sidebar.style.display = "block";
    sidebar.classList.remove('sidebar-hidden');
    sidebar.classList.add('sidebar-visible');
    sidebar.innerHTML = ""; 

    // 4. Inyectar Componentes
    inyectarBotonExhibicion();
    inyectarBuscador();

    if (configMazo.viewMode !== "deck") {
        inyectarFiltroTipo();
        inyectarFiltroRaza();
        if (configMazo.formato === 'racial-edicion') {
            inyectarFiltroEdicion();
        }
    } else {
        const infoDeck = document.createElement('div');
        infoDeck.style.cssText = "padding: 15px; color: #d4af37; font-size: 0.75rem; text-align: center; border: 1px dashed #d4af37; margin-top: 10px; font-family: 'Cinzel', serif; background: rgba(212,175,55,0.05);";
        infoDeck.innerText = "ESTÁS VIENDO TU ESTRATEGIA ACTUAL";
        sidebar.appendChild(infoDeck);
    }

    filtrarCartas();
}

function inyectarBotonExhibicion() {
    const section = document.createElement('section');
    section.className = "filter-group active";
    const esModoDeck = configMazo.viewMode === "deck";
    const textoBtn = esModoDeck ? "⚔️ VOLVER A CONSTRUIR" : "🗂️ VER MI MAZO";
    const claseBtn = esModoDeck ? "btn-exhibicion-toggle modo-deck" : "btn-exhibicion-toggle";

    section.innerHTML = `
        <div class="filter-group-header"><h3>VISTA ACTUAL</h3></div>
        <div class="filter-content">
            <button id="btn-ver-mazo" class="${claseBtn}" onclick="toggleViewMode()">
                ${textoBtn}
            </button>
        </div>
    `;
    document.getElementById('sidebar').appendChild(section);
}

function toggleViewMode() {
    configMazo.viewMode = (configMazo.viewMode === "builder") ? "deck" : "builder";
    actualizarFiltrosSidebar();
}

/**
 * MOTOR DE FILTRADO MAESTRO
 */
function filtrarCartas() {
    const display = document.getElementById('card-display');
    if (!display) return;

    display.innerHTML = ""; 

    const catalogo = window.cartasMyL || (typeof cartasMyL !== 'undefined' ? cartasMyL : []);
    if (catalogo.length === 0) return;

    let fuenteFinal = [];
    const query = (document.getElementById('main-search')?.value || "").toLowerCase();

    // ESCENARIO A: FALTA ORO INICIAL
    if (faseOroInicial) {
        configMazo.viewMode = "builder"; 
        const edicionesPermitidas = BLOQUES[configMazo.bloque] || [];
        
        fuenteFinal = catalogo.filter(c => {
            const esDeEra = edicionesPermitidas.includes(c.Carpeta_Edicion);
            const esOro = c.Tipo.toLowerCase().includes('oro');
            const hab = (c.Habilidad || "").trim().toLowerCase();
            const sinHabilidadReal = hab === "" || hab === "-" || hab.length < 15;
            return esDeEra && esOro && sinHabilidadReal;
        });
    } 
    // ESCENARIO B: VISTA DE MAZO
    else if (configMazo.viewMode === "deck") {
        const idsEnMazo = mazoActual.map(item => item.id);
        fuenteFinal = catalogo.filter(carta => idsEnMazo.includes(carta.ID));
    } 
    // ESCENARIO C: CONSTRUCCIÓN NORMAL
    else {
        const tipoFiltro = document.querySelector('input[name="tipo_carta"]:checked')?.value;
        const f = configMazo.formato;
        const edicionesPermitidas = BLOQUES[configMazo.bloque] || [];

        fuenteFinal = catalogo.filter(c => {
            const tipoCarta = (c.Tipo || "").toLowerCase();
            const edicionCarta = (c.Carpeta_Edicion || "").trim();

            if (!edicionesPermitidas.includes(edicionCarta)) return false;

            if (f === 'racial-libre' || f === 'racial-edicion') {
                if (tipoCarta.includes('aliado') && c.Raza !== configMazo.raza) return false;
            }
            if (f === 'racial-edicion') {
                const edicionFija = obtenerEdicionFija();
                if (edicionFija && edicionCarta !== edicionFija) return false;
            }
            if (tipoFiltro && !tipoCarta.includes(tipoFiltro)) return false;

            return true;
        });
    }

    if (query) {
        fuenteFinal = fuenteFinal.filter(c => 
            c.Nombre.toLowerCase().includes(query) || 
            (c.Habilidad || "").toLowerCase().includes(query)
        );
    }

    if (fuenteFinal.length === 0) {
        display.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 80px; color: rgba(212,175,55,0.4); font-family: 'Cinzel', serif;">NO SE ENCONTRARON CARTAS</div>`;
    } else {
        dibujarCartasConstructor(fuenteFinal);
    }
}

// --- INYECTORES (Siguen igual, pero ahora se ejecutan solo cuando deben) ---

function inyectarBuscador() {
    const section = document.createElement('section');
    section.className = "filter-group active";
    section.innerHTML = `
        <div class="filter-group-header"><h3>BUSCADOR</h3></div>
        <div class="filter-content">
            <input type="text" id="main-search" placeholder="Nombre o habilidad..." oninput="filtrarCartas()">
        </div>
    `;
    document.getElementById('sidebar').appendChild(section);
}

function inyectarFiltroTipo() {
    const section = document.createElement('section');
    section.className = "filter-group active";
    const tipos = ['Aliado', 'Talisman', 'Totem', 'Arma', 'Oro'];
    section.innerHTML = `
        <div class="filter-group-header" onclick="this.parentElement.classList.toggle('active')"><h3>TIPO DE CARTA</h3></div>
        <div class="filter-content">
            <ul class="filter-list">
                ${tipos.map(t => `
                    <li><label class="radio-container">
                        <input type="radio" name="tipo_carta" value="${t.toLowerCase()}" onchange="filtrarCartas()">
                        <span class="checkmark"></span> ${t.toUpperCase()}
                    </label></li>`).join('')}
            </ul>
        </div>
    `;
    document.getElementById('sidebar').appendChild(section);
}

function inyectarFiltroRaza() {
    const section = document.createElement('section');
    section.className = "filter-group active";
    const esFijo = configMazo.formato !== 'libre'; 
    section.innerHTML = `
        <div class="filter-group-header"><h3>RAZA</h3></div>
        <div class="filter-content">
            <select id="raza-filter" class="form-control-místico" ${esFijo ? 'disabled' : ''} onchange="filtrarCartas()">
                <option value="${configMazo.raza}">${configMazo.raza.toUpperCase() || 'TODAS'}</option>
            </select>
        </div>
    `;
    document.getElementById('sidebar').appendChild(section);
}

function inyectarFiltroEdicion() {
    const section = document.createElement('section');
    section.className = "filter-group active";
    let edicionActual = "Elegir carta...";
    const catalogo = window.cartasMyL || (typeof cartasMyL !== 'undefined' ? cartasMyL : []);
    const primeraReal = mazoActual.find(i => {
        const c = catalogo.find(x => x.ID === i.id);
        return !(c?.Tipo.toLowerCase().includes('oro') && (c?.Habilidad || "").length < 30);
    });
    if (primeraReal) {
        const info = catalogo.find(x => x.ID === primeraReal.id);
        edicionActual = info ? info.Carpeta_Edicion.replace(/_/g, ' ') : "Elegir carta...";
    }
    section.innerHTML = `
        <div class="filter-group-header"><h3>EDICIÓN ÚNICA</h3></div>
        <div class="filter-content"><ul class="filter-list"><li style="color:var(--accent); font-weight:bold;">✨ ${edicionActual.toUpperCase()}</li></ul></div>
    `;
    document.getElementById('sidebar').appendChild(section);
}

function obtenerEdicionFija() {
    const catalogo = window.cartasMyL || (typeof cartasMyL !== 'undefined' ? cartasMyL : []);
    const itemFijo = mazoActual.find(item => {
        const c = catalogo.find(x => x.ID === item.id);
        return !(c?.Tipo.toLowerCase().includes('oro') && (c?.Habilidad || "").length < 30);
    });
    return itemFijo ? catalogo.find(x => x.ID === itemFijo.id).Carpeta_Edicion : null;
}