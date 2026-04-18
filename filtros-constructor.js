/**
 * SISTEMA DE FILTRADO DINÁMICO (CEREBRO)
 * Basado en el flujo Era -> Formato -> Oro Inicial
 */

function actualizarFiltrosSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Solo habilitar si se pasó la fase de Oro Inicial
    if (faseOroInicial) {
        sidebar.style.display = "none";
        sidebar.classList.add('sidebar-hidden');
        return;
    }

    // 1. Mostrar y Limpiar Sidebar
    sidebar.style.display = "block";
    sidebar.classList.remove('sidebar-hidden');
    sidebar.classList.add('sidebar-visible');
    sidebar.innerHTML = ""; 

    // 2. BUSCADOR (Siempre disponible)
    inyectarBuscador();

    // 3. FILTRO: TIPO DE CARTA (Siempre disponible)
    inyectarFiltroTipo();

    // 4. FILTRO: RAZA (Siempre se muestra según el cerebro)
    // Pero su comportamiento interno cambia según el formato
    inyectarFiltroRaza();

    // 5. FILTRO: EDICIÓN (Solo en Racial Edición)
    if (configMazo.formato === 'racial-edicion') {
        inyectarFiltroEdicion();
    }

    // Ejecutar filtrado inicial
    filtrarCartas();
}

// --- COMPONENTES DINÁMICOS ---

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
        <div class="filter-group-header" onclick="this.parentElement.classList.toggle('active')">
            <h3>TIPO DE CARTA</h3>
        </div>
        <div class="filter-content">
            <ul class="filter-list">
                ${tipos.map(t => `
                    <li><label class="radio-container">
                        <input type="radio" name="tipo_carta" value="${t.toLowerCase()}" onchange="filtrarCartas()">
                        <span class="checkmark"></span> ${t.toUpperCase()}
                    </label></li>
                `).join('')}
            </ul>
        </div>
    `;
    document.getElementById('sidebar').appendChild(section);
}

function inyectarFiltroRaza() {
    const section = document.createElement('section');
    section.className = "filter-group active";
    // Si el formato es LIBRE, la raza no restringe, pero el filtro existe visualmente
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
    
    // Obtenemos la edición que manda en el mazo
    let edicionActual = "Elegir carta...";
    const primeraReal = mazoActual.find(i => {
        const c = cartasMyL.find(x => x.ID === i.id);
        return !(c.Tipo.toLowerCase().includes('oro') && (c.Habilidad || "").length < 30);
    });
    if (primeraReal) {
        edicionActual = cartasMyL.find(x => x.ID === primeraReal.id).Carpeta_Edicion.replace(/_/g, ' ');
    }

    section.innerHTML = `
        <div class="filter-group-header"><h3>EDICIÓN ÚNICA</h3></div>
        <div class="filter-content">
            <ul class="filter-list">
                <li style="color:var(--accent); font-weight:bold;">✨ ${edicionActual.toUpperCase()}</li>
            </ul>
        </div>
    `;
    document.getElementById('sidebar').appendChild(section);
}

// --- MOTOR DE FILTRADO (TIEMPO REAL) ---

function filtrarCartas() {
    const display = document.getElementById('card-display');
    if (!display || !window.cartasMyL || faseOroInicial) return;

    const query = (document.getElementById('main-search')?.value || "").toLowerCase();
    const tipoFiltro = document.querySelector('input[name="tipo_carta"]:checked')?.value;
    const f = configMazo.formato;

    const filtradas = window.cartasMyL.filter(c => {
        const tipoCarta = (c.Tipo || "").toLowerCase();
        const edicionCarta = (c.Carpeta_Edicion || "").trim();

        // 1. RESTRICCIÓN DE ERA (Siempre activa)
        if (!BLOQUES[configMazo.bloque].includes(edicionCarta)) return false;

        // 2. RESTRICCIONES POR FORMATO
        
        if (f === 'libre') {
            // No hay restricciones de raza ni edición
        } 
        
        else if (f === 'racial-libre') {
            // Aliados restringidos por raza
            if (tipoCarta.includes('aliado') && c.Raza !== configMazo.raza) return false;
            // Otros tipos (Talismán, Arma, etc.) son libres dentro de la era
        } 
        
        else if (f === 'racial-edicion') {
            // Aliados por raza
            if (tipoCarta.includes('aliado') && c.Raza !== configMazo.raza) return false;
            // Todo el mazo restringido a la edición de la primera carta no-oro
            const edicionFija = obtenerEdicionFija();
            if (edicionFija && edicionCarta !== edicionFija) return false;
        }

        // 3. FILTROS DE SIDEBAR (Inputs del usuario)
        if (tipoFiltro && !tipoCarta.includes(tipoFiltro)) return false;
        if (query && !c.Nombre.toLowerCase().includes(query) && !(c.Habilidad || "").toLowerCase().includes(query)) return false;

        return true;
    });

    dibujarCartasConstructor(filtradas);
}

function obtenerEdicionFija() {
    const itemFijo = mazoActual.find(item => {
        const c = window.cartasMyL.find(x => x.ID === item.id);
        return !(c.Tipo.toLowerCase().includes('oro') && (c.Habilidad || "").length < 30);
    });
    return itemFijo ? window.cartasMyL.find(x => x.ID === itemFijo.id).Carpeta_Edicion : null;
}