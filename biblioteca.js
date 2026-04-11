// ==========================================
// BIBLIOTECA.JS - LÓGICA DE EXPLORACIÓN
// ==========================================

// Variable local para manejar los elementos del DOM de esta página
let bibliotecaDOM = [];

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
    
    // --- LÓGICA DEL BOTÓN DE CIERRE ---
    const btnClose = document.getElementById('close-detail');
    const panel = document.getElementById('card-detail-panel');
    
    if (btnClose && panel) {
        btnClose.onclick = () => {
            panel.classList.remove('active');
        };
    }

    // Dibujamos la grilla inicial
    dibujarGrillaBiblioteca(cartasMyL);
    
    // Escuchamos el buscador
    const inputBusqueda = document.getElementById('main-search');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', () => filtrarBiblioteca());
    }

    // Escuchamos Checkboxes, Selects y Rangos
    document.querySelectorAll('.sidebar input, .sidebar select').forEach(control => {
        control.addEventListener('change', () => filtrarBiblioteca());
        if(control.type === 'range') control.addEventListener('input', () => filtrarBiblioteca());
    });

    // Filtro inicial por si viene algo en la URL
    if (typeof revisarParametrosURL === "function") revisarParametrosURL();
}

function dibujarGrillaBiblioteca(lista) {
    const display = document.getElementById('card-display');
    if (!display) return;

    display.innerHTML = '';
    bibliotecaDOM = [];

    const fragmento = document.createDocumentFragment();

    lista.forEach(c => {
        const rutaImg = `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`;
        
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `
            <div class="card-img-container">
                <img src="${rutaImg}" alt="${c.Nombre}" loading="lazy" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="no-img-placeholder" style="display:none;"><span>${c.Nombre}</span></div>
            </div>
        `;

        div.onclick = () => abrirDetalleBiblioteca(c, rutaImg);

        fragmento.appendChild(div);
        bibliotecaDOM.push({ info: c, el: div });
    });

    display.appendChild(fragmento);
    actualizarContador(lista.length);
}

function filtrarBiblioteca() {
    const busqueda = document.getElementById('main-search')?.value.toLowerCase() || "";
    const raza = document.getElementById('raza-filter')?.value.toLowerCase() || "";
    const costeMax = parseInt(document.getElementById('filter-coste')?.value) || 10;
    const fuerzaMin = parseInt(document.getElementById('filter-fuerza')?.value) || 0;

    if (document.getElementById('val-coste')) document.getElementById('val-coste').innerText = costeMax;
    if (document.getElementById('val-fuerza')) document.getElementById('val-fuerza').innerText = fuerzaMin;

    const activos = Array.from(document.querySelectorAll('.sidebar input[type="checkbox"]:checked'))
                         .map(i => i.value);

    let visibles = 0;

    bibliotecaDOM.forEach(item => {
        const c = item.info;
        const matchTexto = c.Nombre.toLowerCase().includes(busqueda) || 
                          (c.Habilidad && c.Habilidad.toLowerCase().includes(busqueda));
        const matchRaza = raza === "" || (c.Raza && c.Raza.toLowerCase() === raza);
        const edicionNorm = (c.Carpeta_Edicion || "").toLowerCase().replace(/_/g, '-');
        const matchEdicion = activos.length === 0 || activos.includes(edicionNorm) || activos.includes(c.Tipo.toLowerCase());
        const nCoste = parseInt(c.Coste) || 0;
        const nFuerza = parseInt(c.Fuerza) || 0;
        const matchStats = nCoste <= costeMax && (c.Tipo.toLowerCase().includes('aliado') ? nFuerza >= fuerzaMin : true);

        if (matchTexto && matchRaza && matchEdicion && matchStats) {
            item.el.style.display = 'block';
            visibles++;
        } else {
            item.el.style.display = 'none';
        }
    });

    actualizarContador(visibles);
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

    // Setear información básica
    document.getElementById('detail-img').src = ruta;
    document.getElementById('detail-name').innerText = c.Nombre;
    
    const stats = c.Tipo.toLowerCase().includes('aliado') ? ` | C:${c.Coste} F:${c.Fuerza}` : ` | C:${c.Coste || 0}`;
    document.getElementById('detail-type').innerText = `${c.Tipo.toUpperCase()} ${c.Raza ? '- ' + c.Raza : ''}${stats}`;
    
    document.getElementById('detail-id').innerText = c.ID;
    document.getElementById('detail-edition').innerText = (c.Edicion || "Primera Era").toUpperCase();
    document.getElementById('detail-text').innerHTML = `<div style="font-style:italic;">${c.Habilidad || "Sin habilidad."}</div>`;
    if (document.getElementById('detail-illustrator')) {
        document.getElementById('detail-illustrator').innerText = `Ilustrador: ${c.Ilustrador || 'Desconocido'}`;
    }

    // Inyectar Botones de Carpeta con verificación de existencia
    const btnContainer = document.getElementById('save-button-container');
    if (btnContainer) {
        btnContainer.innerHTML = ""; 

        if (usuarioActual) {
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
                const listaCartas = data.cartas || [];

                const yaLaTiene = listaCartas.some(item => item.id === c.ID);

                if (!yaLaTiene) {
                    const btn = document.createElement('button');
                    btn.className = "btn-folder-add";
                    btn.innerHTML = `<span>${f.icono}</span> ${f.nombre}`;
                    
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const exito = await ejecutarEnvioACarpeta(c.ID, f.id, f.nombre);
                        if (exito) {
                            btn.style.opacity = "0";
                            btn.style.transform = "scale(0.8)";
                            btn.style.pointerEvents = "none";
                            setTimeout(() => btn.remove(), 300);
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

async function ejecutarEnvioACarpeta(id, slot, nombre) {
    try {
        if (typeof añadirACarpetaLibre === 'function') {
            await añadirACarpetaLibre(id, slot, nombre);
            return true;
        } else {
            console.error("Error: añadirACarpetaLibre no definida en app.js");
            return false;
        }
    } catch (error) {
        return false;
    }
}

// CIERRE DE EMERGENCIA (Por delegación de eventos)
document.addEventListener('click', (e) => {
    if (e.target.id === 'close-detail' || e.target.closest('#close-detail')) {
        const panel = document.getElementById('card-detail-panel');
        if (panel) panel.classList.remove('active');
    }
});