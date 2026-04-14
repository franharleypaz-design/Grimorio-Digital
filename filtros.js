// ==========================================
// FILTROS.JS - MOTOR ESTRATÉGICO UNIFICADO
// ==========================================

// 1. JERARQUÍA COMPLETA (Claves deben coincidir exactamente con Carpeta_Edicion del JSON)
const jerarquiaCartas = {
    "primera_era": {
        "El_Reto": { razas: ["Caballero", "Dragón", "Faerie"], subs: null },
        "Espiritu_de_Dragon": { razas: ["Kami", "Campeón", "Xian", "Criatura"], subs: null },
        "La_ira_del_Nahual": { razas: ["Chamán", "Guerrero", "Bestia"], subs: null },
        "Mundo_Gotico": { razas: ["Vampiro", "Cazador", "Licántropo"], subs: null },
        "Ragnarok": { razas: ["Dios", "Abominación", "Bárbaro"], subs: null }
    },
    "primer_bloque": {
        "Dominios_de_Ra": { razas: ["Eterno", "Faraón", "Sacerdote"], subs: ["Encrucijada"] },
        "Espada_Sagrada": { razas: ["Caballero", "Dragón", "Faerie"], subs: ["Cruzadas"] },
        "Helenica": { razas: ["Héroe", "Olímpico", "Titán"], subs: ["Imperio"] },
        "Hijos_de_Daana": { razas: ["Desafiante", "Defensor", "Sombra"], subs: ["Tierras_Altas"] }
    }
};

/**
 * Función Maestra de Rutas: Detecta si es expansión o base para armar la URL
 */
function obtenerRutaImagenGeneral(c) {
    if (!c || !c.Bloque || !c.Carpeta_Edicion || !c.ID) return 'img/placeholder-carta.png';
    
    const idLimpiado = String(c.ID).split(' ')[0].trim();
    const bloque = String(c.Bloque).trim().toLowerCase();
    const carpeta = String(c.Carpeta_Edicion).trim();

    let edicionPadre = carpeta;
    let esExpansion = false;

    for (const era in jerarquiaCartas) {
        for (const edBase in jerarquiaCartas[era]) {
            const dataEdicion = jerarquiaCartas[era][edBase];
            const expansiones = dataEdicion.subs;
            if (expansiones && expansiones.includes(carpeta)) {
                edicionPadre = edBase; 
                esExpansion = true;
                break;
            }
        }
    }

    if (esExpansion) {
        return `img/cartas/${bloque}/${edicionPadre}/${carpeta}/${idLimpiado}.jpg`;
    } else {
        return `img/cartas/${bloque}/${carpeta}/${idLimpiado}.jpg`;
    }
}

/**
 * LÓGICA DINÁMICA DE LA INTERFAZ (UI)
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        // AGREGAR BOTÓN DE LIMPIEZA ARRIBA
        const btnLimpiarSuperior = document.createElement('button');
        btnLimpiarSuperior.id = 'btn-limpiar-filtros-top';
        btnLimpiarSuperior.className = 'btn-místico-sm'; 
        btnLimpiarSuperior.innerHTML = '✨ LIMPIAR FILTROS';
        btnLimpiarSuperior.onclick = limpiarFiltrosInterfaz;
        sidebar.prepend(btnLimpiarSuperior);
    }

    // A. Escuchar cambios en Era/Bloque (Nivel 1)
    const eraRadios = document.querySelectorAll('.filter-era');
    eraRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            actualizarNivelEdiciones(this.value);
            limpiarNivelExpansiones(); 
            actualizarListaRazas(); // NUEVO: Actualiza razas al cambiar de Era
            ejecutarFiltradoDependiente();
        });
    });

    // B. Escuchar cambios en Tipo de Carta (Nivel 4) y Raza (Nivel 5)
    const tipoRadios = document.querySelectorAll('.filter-type');
    tipoRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            gestionarFiltroRaza(this.value);
            ejecutarFiltradoDependiente();
        });
    });

    const razaSelect = document.getElementById('raza-filter');
    if (razaSelect) {
        razaSelect.addEventListener('change', ejecutarFiltradoDependiente);
    }

    // C. Escuchar cambios en Sliders de Estadísticas
    const filterCoste = document.getElementById('filter-coste');
    const filterFuerza = document.getElementById('filter-fuerza');
    
    if (filterCoste) {
        filterCoste.addEventListener('input', () => {
            document.getElementById('val-coste').innerText = filterCoste.value;
            ejecutarFiltradoDependiente();
        });
    }
    if (filterFuerza) {
        filterFuerza.addEventListener('input', () => {
            document.getElementById('val-fuerza').innerText = filterFuerza.value;
            ejecutarFiltradoDependiente();
        });
    }

    // D. Botón limpiar búsqueda (X) y entrada de texto
    const searchInput = document.getElementById('main-search');
    const clearBtn = document.getElementById('btn-clear-search');
    if (searchInput && clearBtn) {
        searchInput.addEventListener('input', () => {
            clearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
            ejecutarFiltradoDependiente();
        });
        clearBtn.addEventListener('click', () => {
            searchInput.value = "";
            clearBtn.style.display = 'none';
            searchInput.focus();
            ejecutarFiltradoDependiente();
        });
    }
});

/**
 * Habilita o deshabilita el selector de raza según el tipo
 */
function gestionarFiltroRaza(tipoSeleccionado) {
    const seccionRaza = document.getElementById('section-raza');
    const razaSelect = document.getElementById('raza-filter');

    if (tipoSeleccionado === 'aliado') {
        if (seccionRaza) seccionRaza.classList.remove('disabled');
        actualizarListaRazas(); // NUEVO: Refresca el contenido al habilitar
    } else {
        if (seccionRaza) seccionRaza.classList.add('disabled');
        if (razaSelect) razaSelect.value = ""; // Limpiar raza si no es aliado
    }
}

/**
 * Inyecta las Ediciones Principales (Nivel 2)
 */
function actualizarNivelEdiciones(era) {
    const contenedor = document.getElementById('lista-ediciones');
    const seccion = document.getElementById('section-ediciones');
    if (!contenedor || !seccion) return;

    seccion.classList.remove('disabled');
    contenedor.innerHTML = '';

    const ediciones = Object.keys(jerarquiaCartas[era] || {});
    
    ediciones.forEach(ed => {
        const li = document.createElement('li');
        li.innerHTML = `
            <label class="radio-container">
                <input type="radio" name="edicion_principal" value="${ed}" class="filter-ed-principal">
                <span class="checkmark"></span> ${ed.replace(/_/g, ' ').toUpperCase()}
            </label>
        `;
        contenedor.appendChild(li);
    });

    document.querySelectorAll('.filter-ed-principal').forEach(radio => {
        radio.addEventListener('change', function() {
            const eraActiva = document.querySelector('.filter-era:checked').value;
            actualizarNivelExpansiones(eraActiva, this.value);
            actualizarListaRazas(); // NUEVO: Las razas cambian al seleccionar edición
            ejecutarFiltradoDependiente();
        });
    });
}

/**
 * Inyecta las Expansiones (Nivel 3)
 */
function actualizarNivelExpansiones(era, edicionNombre) {
    const contenedor = document.getElementById('lista-expansiones');
    const seccion = document.getElementById('section-expansiones');
    if (!contenedor || !seccion) return;

    const dataEdicion = jerarquiaCartas[era][edicionNombre];
    const subEdiciones = dataEdicion ? dataEdicion.subs : null;

    if (subEdiciones && subEdiciones.length > 0) {
        seccion.classList.remove('disabled');
        contenedor.innerHTML = '';
        subEdiciones.forEach(sub => {
            const li = document.createElement('li');
            li.innerHTML = `
                <label>
                    <input type="checkbox" class="filter-sub-edition" value="${sub}" onchange="ejecutarFiltradoDependiente()"> 
                    ${sub.replace(/_/g, ' ').toUpperCase()}
                </label>
            `;
            contenedor.appendChild(li);
        });
    } else {
        limpiarNivelExpansiones();
    }
}

/**
 * ACTUALIZA EL SELECT DE RAZAS SEGÚN EL CONTEXTO (NUEVA FUNCIÓN)
 */
function actualizarListaRazas() {
    const select = document.getElementById('raza-filter');
    if (!select) return;

    const eraActiva = document.querySelector('.filter-era:checked')?.value;
    const edActiva = document.querySelector('.filter-ed-principal:checked')?.value;
    
    let razasAMostrar = [];

    if (edActiva && eraActiva) {
        // Caso A: Edición específica seleccionada
        razasAMostrar = jerarquiaCartas[eraActiva][edActiva].razas;
    } else if (eraActiva) {
        // Caso B: Solo Era seleccionada (unir todas las razas de esa Era)
        const ediciones = jerarquiaCartas[eraActiva];
        for (let ed in ediciones) {
            razasAMostrar = [...new Set([...razasAMostrar, ...ediciones[ed].razas])];
        }
    }

    // Poblar el select manteniendo la opción "Todas"
    select.innerHTML = '<option value="">Todas las razas</option>';
    razasAMostrar.sort().forEach(raza => {
        const opt = document.createElement('option');
        opt.value = raza.toLowerCase();
        opt.textContent = raza;
        select.appendChild(opt);
    });
}

function limpiarNivelExpansiones() {
    const seccion = document.getElementById('section-expansiones');
    const contenedor = document.getElementById('lista-expansiones');
    if (seccion) seccion.classList.add('disabled');
    if (contenedor) contenedor.innerHTML = '<p class="placeholder-text">Sin expansiones</p>';
}

/**
 * Motor de Búsqueda Avanzado
 */
function motorDeFiltradoGlobal(listaAFiltrar) {
    const searchInput = document.getElementById('main-search');
    let busquedaOriginal = searchInput?.value.toLowerCase() || "";
    
    const costeMatch = busquedaOriginal.match(/c:(\d+)/);
    const fuerzaMatch = busquedaOriginal.match(/f:(\d+)/);
    const costeFiltroTxt = costeMatch ? parseInt(costeMatch[1]) : null;
    const fuerzaFiltroTxt = fuerzaMatch ? parseInt(fuerzaMatch[1]) : null;
    
    let busquedaLimpia = busquedaOriginal.replace(/c:\d+/g, "").replace(/f:\d+/g, "").trim();

    const eraActiva = document.querySelector('.filter-era:checked')?.value || "";
    const edPrincipalActiva = document.querySelector('.filter-ed-principal:checked')?.value || "";
    const expansionesActivas = Array.from(document.querySelectorAll('.filter-sub-edition:checked')).map(i => i.value);

    const tipoActivo = document.querySelector('.filter-type:checked')?.value || "";
    const razaActiva = document.getElementById('raza-filter')?.value || "";
    const costeMaxSlider = parseInt(document.getElementById('filter-coste')?.value) || 10;
    const fuerzaMinSlider = parseInt(document.getElementById('filter-fuerza')?.value) || 0;

    return listaAFiltrar.filter(c => {
        const bloqueJson = (c.Bloque || "").toLowerCase();
        const carpetaJson = (c.Carpeta_Edicion || "");
        const tipoJson = (c.Tipo || "").toLowerCase();
        const razaJson = (c.Raza || "").toLowerCase();
        const nCoste = parseInt(c.Coste) || 0;
        const nFuerza = parseInt(c.Fuerza) || 0;
        
        if (eraActiva && bloqueJson !== eraActiva) return false;

        if (edPrincipalActiva) {
            if (expansionesActivas.length > 0) {
                if (!expansionesActivas.includes(carpetaJson)) return false;
            } else {
                const expansionesPosibles = jerarquiaCartas[bloqueJson][edPrincipalActiva].subs || [];
                if (carpetaJson !== edPrincipalActiva && !expansionesPosibles.includes(carpetaJson)) return false;
            }
        }

        if (tipoActivo && tipoJson !== tipoActivo) return false;
        if (tipoActivo === 'aliado' && razaActiva && razaJson !== razaActiva) return false;

        const matchTexto = !busquedaLimpia || (c.Nombre || "").toLowerCase().includes(busquedaLimpia) || (c.Habilidad || "").toLowerCase().includes(busquedaLimpia);
        const matchCosteTxt = (costeFiltroTxt === null) || (nCoste === costeFiltroTxt);
        const matchFuerzaTxt = (fuerzaFiltroTxt === null) || (nFuerza === fuerzaFiltroTxt);
        if (!matchTexto || !matchCosteTxt || !matchFuerzaTxt) return false;

        if (nCoste > costeMaxSlider) return false;
        if (tipoJson.includes('aliado') && nFuerza < fuerzaMinSlider) return false;

        return true;
    });
}

/**
 * Función puente para llamar al filtrado de la página activa
 */
function ejecutarFiltradoDependiente() {
    if (typeof filtrarBiblioteca === 'function') filtrarBiblioteca();
    if (typeof filtrarCartas === 'function') filtrarCartas();
}

/**
 * Limpia todos los filtros y reinicia la UI
 */
function limpiarFiltrosInterfaz() {
    const searchInput = document.getElementById('main-search');
    if (searchInput) searchInput.value = "";
    
    document.querySelectorAll('.sidebar input[type="radio"], .sidebar input[type="checkbox"]').forEach(i => i.checked = false);
    
    if (document.getElementById('raza-filter')) {
        document.getElementById('raza-filter').innerHTML = '<option value="">Todas las razas</option>';
        document.getElementById('raza-filter').value = "";
    }
    
    const filterCoste = document.getElementById('filter-coste');
    const filterFuerza = document.getElementById('filter-fuerza');
    if (filterCoste) {
        filterCoste.value = 10;
        document.getElementById('val-coste').innerText = 10;
    }
    if (filterFuerza) {
        filterFuerza.value = 0;
        document.getElementById('val-fuerza').innerText = 0;
    }

    const seccionEdi = document.getElementById('section-ediciones');
    if (seccionEdi) seccionEdi.classList.add('disabled');
    
    const seccionRaza = document.getElementById('section-raza');
    if (seccionRaza) seccionRaza.classList.add('disabled');

    limpiarNivelExpansiones();
    ejecutarFiltradoDependiente();
}