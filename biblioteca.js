// ==========================================
// BIBLIOTECA.JS - LÓGICA DE EXPLORACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Esperamos a que app.js cargue el JSON global
    const checkDatos = setInterval(() => {
        if (typeof cartasMyL !== 'undefined' && cartasMyL.length > 0) {
            clearInterval(checkDatos);
            inicializarBiblioteca();
        }
    }, 100);
});

function inicializarBiblioteca() {
    console.log("📚 Biblioteca Iniciada con", cartasMyL.length, "cartas.");
    
    // --- CONFIGURACIÓN PANEL DETALLE ---
    const btnClose = document.getElementById('close-detail');
    const panel = document.getElementById('card-detail-panel');
    if (btnClose && panel) {
        btnClose.onclick = () => panel.classList.remove('active');
    }

    // --- RENDERIZADO INICIAL ---
    filtrarBiblioteca(); 
    
    // --- PROCESAR FILTRO DE URL ---
    revisarParametrosURL();
}

/**
 * FUNCIÓN DE RUTAS DINÁMICA (SOLUCIÓN DEFINITIVA)
 * Resuelve la estructura anidada según tu diagrama de árbol:
 * primer_bloque/Padre/Hijo (Aniversarios y Expansiones)
 */
function obtenerRutaImagenGeneral(c) {
    const bloque = (c.Bloque || "").trim();
    const edicion = (c.Carpeta_Edicion || "").trim();
    const imagen = (c.Imagen || "").trim();

    // 1. Si el bloque es primera_era (El_Reto, Ragnarok, etc.), ruta directa
    if (bloque === "primera_era") {
        return `img/cartas/${bloque}/${edicion}/${imagen}`;
    }

    // 2. Si es primer_bloque, aplicamos lógica de carpetas padre (Espada, Helénica, etc.)
    if (bloque === "primer_bloque") {
        let carpetaPadre = "";

        // Determinamos la carpeta padre según la edición
        if (edicion.includes("Espada_Sagrada") || edicion === "Cruzadas") {
            carpetaPadre = "Espada_Sagrada";
        } 
        else if (edicion.includes("Helenica") || edicion === "Imperio") {
            carpetaPadre = "Helenica";
        } 
        else if (edicion.includes("Hijos_de_Daana") || edicion === "Tierras_Altas") {
            carpetaPadre = "Hijos_de_Daana";
        } 
        else if (edicion.includes("Dominios_de_Ra") || edicion === "Encrucijada") {
            carpetaPadre = "Dominios_de_Ra";
        }

        if (carpetaPadre) {
            // Si la edición es la base (ej: Espada_Sagrada), no anidamos más
            if (carpetaPadre === edicion) {
                return `img/cartas/${bloque}/${carpetaPadre}/${imagen}`;
            }
            // Si es edición especial o aniversario (ej: Espada_Sagrada/Cruzadas), anidamos
            return `img/cartas/${bloque}/${carpetaPadre}/${edicion}/${imagen}`;
        }
    }

    // 3. Fallback: Ruta estándar
    return `img/cartas/${bloque}/${edicion}/${imagen}`;
}

/**
 * Filtro proveniente del Portal (Index)
 */
function revisarParametrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const bloqueURL = urlParams.get('bloque'); 

    if (bloqueURL) {
        const radioEra = document.querySelector(`.filter-era[value="${bloqueURL}"]`);
        if (radioEra) {
            radioEra.checked = true;
            radioEra.dispatchEvent(new Event('change'));
        }
    }
}

/**
 * FUNCIÓN MAESTRA DE FILTRADO
 */
function filtrarBiblioteca() {
    if (typeof motorDeFiltradoGlobal !== 'function') {
        console.error("❌ filtros.js no detectado.");
        return;
    }

    const cartasFiltradas = motorDeFiltradoGlobal(cartasMyL);
    dibujarGrillaBiblioteca(cartasFiltradas);
}

/**
 * Dibuja las cartas en el contenedor principal
 */
function dibujarGrillaBiblioteca(lista) {
    const display = document.getElementById('card-display');
    if (!display) return;

    display.innerHTML = '';
    const fragmento = document.createDocumentFragment();

    lista.forEach(c => {
        const rutaImg = obtenerRutaImagenGeneral(c);
        
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `
            <div class="card-img-container">
                <img src="${rutaImg}" alt="${c.Nombre}" loading="lazy" 
                     onerror="this.src='img/placeholder.png'">
            </div>
        `;

        div.onclick = () => abrirDetalleBiblioteca(c, rutaImg);
        fragmento.appendChild(div);
    });

    display.appendChild(fragmento);
    actualizarContador(lista.length);
}

function actualizarContador(n) {
    const el = document.getElementById('card-count');
    if (el) el.innerText = n;
}

// ==========================================
// LÓGICA DE DETALLE Y BOTONES DE CARPETA
// ==========================================

async function abrirDetalleBiblioteca(c, ruta) {
    const panel = document.getElementById('card-detail-panel');
    if (!panel) return;

    document.getElementById('detail-img').src = ruta;
    document.getElementById('detail-name').innerText = c.Nombre;
    
    const stats = c.Tipo.toLowerCase().includes('aliado') ? ` | C:${c.Coste} F:${c.Fuerza}` : ` | C:${c.Coste || 0}`;
    document.getElementById('detail-type').innerText = `${c.Tipo.toUpperCase()} ${c.Raza ? '- ' + c.Raza : ''}${stats}`;
    
    document.getElementById('detail-id').innerText = c.ID;
    document.getElementById('detail-edition').innerText = (c.Edicion || "Base").toUpperCase();
    document.getElementById('detail-text').innerHTML = `<div style="font-style:italic;">${c.Habilidad || "Sin habilidad."}</div>`;
    
    if (document.getElementById('detail-illustrator')) {
        document.getElementById('detail-illustrator').innerText = `Ilustrador: ${c.Ilustrador || 'Desconocido'}`;
    }

    const btnContainer = document.getElementById('save-button-container');
    if (btnContainer) {
        btnContainer.innerHTML = ""; 

        if (typeof usuarioActual !== 'undefined' && usuarioActual) {
            const carpetas = [
                { id: 'carpeta1', nombre: 'VENTAS', icono: '📁' },
                { id: 'carpeta2', nombre: 'COLECCIÓN', icono: '✨' },
                { id: 'carpeta3', nombre: 'TRADES', icono: '🤝' }
            ];

            const divOpciones = document.createElement('div');
            divOpciones.className = "folder-actions-row";

            const promesas = carpetas.map(f => 
                db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(f.id).get()
            );

            const snapshots = await Promise.all(promesas);

            snapshots.forEach((doc, index) => {
                const f = carpetas[index];
                const data = doc.exists ? doc.data() : { cartas: [] };
                const yaLaTiene = (data.cartas || []).some(item => item.id === c.ID);

                if (!yaLaTiene) {
                    const btn = document.createElement('button');
                    btn.className = "btn-folder-add";
                    btn.innerHTML = `<span>${f.icono}</span> ${f.nombre}`;
                    
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const exito = await ejecutarEnvioACarpeta(c.ID, f.id, f.nombre);
                        if (exito) {
                            btn.style.opacity = "0.5";
                            btn.style.pointerEvents = "none";
                            btn.innerText = "¡GUARDADA!";
                        }
                    };
                    divOpciones.appendChild(btn);
                }
            });
            btnContainer.appendChild(divOpciones);
        }
    }

    panel.classList.add('active');
}

async function ejecutarEnvioACarpeta(id, slot, nombreCarpeta) {
    try {
        if (typeof añadirACarpetaLibre === 'function') {
            await añadirACarpetaLibre(id, slot, nombreCarpeta);
            return true;
        } else {
            console.error("Error: añadirACarpetaLibre no definida en app.js");
            return false;
        }
    } catch (error) {
        console.error("Error al ejecutar envío:", error);
        return false;
    }
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'close-detail' || e.target.closest('#close-detail')) {
        const panel = document.getElementById('card-detail-panel');
        if (panel) panel.classList.remove('active');
    }
});