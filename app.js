// ==========================================
// 1. CONFIGURACIÓN FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB1OmhfpwB-wjsnjhunDCm9Lev5yXLO3E4",
    authDomain: "bibliotecamyl-88ab5.firebaseapp.com",
    projectId: "bibliotecamyl-88ab5",
    storageBucket: "bibliotecamyl-88ab5.firebasestorage.app",
    messagingSenderId: "1093812970594",
    appId: "1:1093812970594:web:60831d9139b37c7858dd3b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. VARIABLES GLOBALES Y SELECTORES
// ==========================================
let cartasMyL = [];
let usuarioActual = null;
let modoCarpeta = false;
let elementosCartasDOM = [];

const display = document.getElementById('card-display');
const count = document.getElementById('card-count');
const buscador = document.getElementById('main-search');
const panel = document.getElementById('card-detail-panel');

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}
const filtrarCartasOptimizado = debounce(() => filtrarCartas());

// ==========================================
// 3. CARGAR DATOS (JSON) - MODIFICADO PARA SINCRONIZACIÓN
// ==========================================
async function cargarGrimorio() {
    // Si ya están cargadas, retornamos la lista actual
    if (cartasMyL.length > 0) return cartasMyL;

    try {
        const respuesta = await fetch('cartas.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar cartas.json");

        const data = await respuesta.json();
        const nombreClave = Object.keys(data).find(k => k.toLowerCase().includes("carga masiva"));

        if (nombreClave && data[nombreClave]) {
            cartasMyL = data[nombreClave];

            if (window.location.pathname.includes('biblioteca.html')) {
                modoCarpeta = false;
                if (display) dibujarCartas(cartasMyL);
                filtrarCartas();
                revisarParametrosURL();
            } else if (window.location.pathname.includes('grimorio.html')) {
                modoCarpeta = true;
                if (display) {
                    display.innerHTML = '<p style="text-align:center; color:var(--accent); margin-top:50px;">Consultando registros del abismo...</p>';
                }
            }
            // Retornamos los datos para que otros scripts puedan esperar (await)
            return cartasMyL;
        }
    } catch (error) {
        console.error("Error al leer el Grimorio:", error);
        return [];
    }
}

// ==========================================
// 4. LÓGICA DE FILTRADO
// ==========================================
async function filtrarCartas() {
    if (!display || elementosCartasDOM.length === 0) {
        return;
    }

    const texto = buscador ? buscador.value.toLowerCase() : "";
    const raza = document.getElementById('raza-filter')?.value.toLowerCase() || "";
    const costeMax = parseInt(document.getElementById('filter-coste')?.value) || 10;
    const fuerzaMin = parseInt(document.getElementById('filter-fuerza')?.value) || 0;

    if (document.getElementById('val-coste')) document.getElementById('val-coste').innerText = costeMax;
    if (document.getElementById('val-fuerza')) document.getElementById('val-fuerza').innerText = fuerzaMin;

    const activos = Array.from(document.querySelectorAll('.sidebar input[type="checkbox"]:checked'))
        .map(input => input.value);

    const edicionesActivas = activos.filter(v => ["espada-sagrada", "helenica", "hijos-daana"].includes(v));
    const tiposActivos = activos.filter(v => ["aliado", "totem", "talisman", "oro", "arma"].includes(v));

    let contadorVisibles = 0;

    elementosCartasDOM.forEach(item => {
        const c = item.info;

        const matchTexto = c.Nombre.toLowerCase().includes(texto) || (c.Habilidad && c.Habilidad.toLowerCase().includes(texto));
        const matchRaza = raza === "" || (c.Raza && c.Raza.toLowerCase() === raza);
        const edicionNorm = c.Carpeta_Edicion.toLowerCase().replace(/_/g, '-');
        const matchEdicion = edicionesActivas.length === 0 || edicionesActivas.includes(edicionNorm);
        const tipoNorm = c.Tipo.toLowerCase().trim();
        const matchTipo = tiposActivos.length === 0 || tiposActivos.includes(tipoNorm);
        const nCoste = parseInt(c.Coste) || 0;
        const nFuerza = parseInt(c.Fuerza) || 0;
        const matchCoste = nCoste <= costeMax;
        const matchFuerza = (tipoNorm.includes('aliado')) ? (nFuerza >= fuerzaMin) : true;

        if (matchTexto && matchRaza && matchEdicion && matchTipo && matchCoste && matchFuerza) {
            item.el.style.display = 'block';
            contadorVisibles++;
        } else {
            item.el.style.display = 'none';
        }
    });

    if (count) count.innerText = contadorVisibles;
}

// ==========================================
// 5. RENDERIZADO DE CARTAS Y DETALLE
// ==========================================
function dibujarCartas(lista) {
    if (!display) return;
    display.innerHTML = '';
    elementosCartasDOM = [];

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
        div.onclick = () => {
            if (typeof añadirCarta === 'function') {
                añadirCarta(c.ID);
            } else {
                mostrarDetalle(c, rutaImg);
            }
        };
        fragmento.appendChild(div);
        elementosCartasDOM.push({ info: c, el: div });
    });
    display.appendChild(fragmento);
}

function mostrarDetalle(c, ruta) {
    if (!panel) return;
    
    panel.scrollTop = 0; 
    
    document.getElementById('detail-img').src = ruta;
    document.getElementById('detail-name').innerText = c.Nombre;
    let stats = c.Tipo.toLowerCase().includes('aliado') ? ` | C:${c.Coste} F:${c.Fuerza}` : ` | C:${c.Coste || 0}`;
    document.getElementById('detail-type').innerText = `${c.Tipo.toUpperCase()} ${c.Raza ? '- ' + c.Raza : ''}${stats}`;

    if (document.getElementById('detail-id')) document.getElementById('detail-id').innerText = c.ID;
    if (document.getElementById('detail-edition')) document.getElementById('detail-edition').innerText = c.Edicion.toUpperCase();
    document.getElementById('detail-text').innerHTML = `<div style="font-style:italic;">${c.Habilidad || "Sin habilidad."}</div>`;

    const btnContainer = document.getElementById('save-button-container');
    if (btnContainer) {
        btnContainer.innerHTML = "";
        if (usuarioActual) {
            const divOpciones = document.createElement('div');
            divOpciones.style.display = "flex";
            divOpciones.style.justifyContent = "center";
            divOpciones.style.gap = "8px";
            divOpciones.style.marginTop = "15px";
            divOpciones.style.flexWrap = "wrap";

            const carpetas = [
                { id: 'carpeta1', nombre: 'VENTAS', icono: '📁' },
                { id: 'carpeta2', nombre: 'COLECCIÓN', icono: '✨' },
                { id: 'carpeta3', nombre: 'TRADES', icono: '🤝' }
            ];

            const promesas = carpetas.map(f => 
                db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(f.id).get()
            );

            Promise.all(promesas).then(snapshots => {
                snapshots.forEach((doc, index) => {
                    const f = carpetas[index];
                    const data = doc.exists ? doc.data() : { cartas: [] };
                    const yaExiste = data.cartas && data.cartas.some(item => item.id === c.ID);

                    if (!yaExiste) {
                        const btn = document.createElement('button');
                        btn.className = "btn-save-card";
                        btn.style.fontSize = "0.65rem";
                        btn.style.padding = "6px 10px";
                        btn.style.minWidth = "80px";
                        btn.style.flex = "1";
                        btn.innerHTML = `${f.icono}<br>${f.nombre}`;
                        
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            añadirACarpetaLibre(c.ID, f.id, f.nombre);
                            btn.style.opacity = "0";
                            setTimeout(() => btn.remove(), 300);
                        };
                        divOpciones.appendChild(btn);
                    }
                });
                btnContainer.appendChild(divOpciones);
            });
        } else {
            btnContainer.innerHTML = "";
        }
    }

    if (document.getElementById('detail-illustrator')) document.getElementById('detail-illustrator').innerText = `Ilustrador: ${c.Ilustrador}`;

    const relContainer = document.getElementById('related-buttons-container');
    const relSection = document.getElementById('related-cards-section');
    if (relContainer) {
        relContainer.innerHTML = ""; 
        if (c.Relacionadas) {
            relSection.style.display = "block";
            const idsRel = c.Relacionadas.split(',').map(id => id.trim());
            idsRel.forEach(idRel => {
                const infoRel = cartasMyL.find(item => item.ID === idRel);
                if (infoRel) {
                    const btnRel = document.createElement('button');
                    btnRel.className = "btn-rel-jump"; 
                    btnRel.innerText = idRel; 
                    btnRel.onclick = () => {
                        const nuevaRuta = `img/cartas/${infoRel.Bloque}/${infoRel.Carpeta_Edicion}/${infoRel.Imagen}`;
                        mostrarDetalle(infoRel, nuevaRuta);
                    };
                    relContainer.appendChild(btnRel);
                }
            });
        } else {
            relSection.style.display = "none";
        }
    }
    panel.classList.add('active');
}

// ==========================================
// 6. GESTIÓN DE SESIÓN (AUTH)
// ==========================================
auth.onAuthStateChanged(async user => {
    const loginBtn = document.getElementById('btn-login');
    const userSection = document.getElementById('user-logged');
    const contenedorBoton = document.getElementById('contenedor-boton-santuario');
    
    const rutasPrivadas = ['perfil.html', 'grimorio.html', 'constructor.html'];
    const esRutaPrivada = rutasPrivadas.some(p => window.location.pathname.includes(p));

    if (user) {
        usuarioActual = user;
        if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
        if (userSection) userSection.style.display = 'flex';

        if (contenedorBoton) {
            contenedorBoton.innerHTML = `
                <button id="nav-santuario" onclick="location.href='grimorio.html'" class="btn-dorado-santuario">
                    ENTRAR AL SANTUARIO
                </button>
            `;
        }

        if (window.location.pathname.includes('grimorio.html')) {
            try {
                const doc = await db.collection('carpetas').doc(user.uid).get();
                const idsGuardados = doc.exists ? doc.data().cartas || [] : [];
                const cartasUsuario = cartasMyL.filter(c => idsGuardados.includes(c.ID));
                dibujarCartas(cartasUsuario);
                setTimeout(() => filtrarCartas(), 300);
            } catch (error) {
                console.error("Error al cargar cartas del usuario:", error);
            }
        }

        if (window.location.pathname.includes('perfil.html')) {
            cargarTarjetaInvocador(user.uid);
        } else {
            const nameHeader = document.getElementById('display-name-text');
            db.collection('usuarios').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.nickname && nameHeader) nameHeader.innerText = data.nickname;
                    if (data.photoCustom) cargarImagenSegura('user-photo', data.photoCustom);
                }
            });
        }
    } else {
        usuarioActual = null;
        if (contenedorBoton) contenedorBoton.innerHTML = "";

        if (esRutaPrivada) {
            window.location.href = 'index.html';
        }
        
        if (loginBtn) {
            loginBtn.style.setProperty('display', 'inline-block', 'important');
            loginBtn.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        }
        if (userSection) userSection.style.display = 'none';
    }
});

// ==========================================
// 7. FUNCIONES DEL GRIMORIO (FIREBASE)
// ==========================================
async function añadirACarpetaLibre(cartaId, carpetaSlot, nombreCarpeta) {
    if (!usuarioActual) return;

    const docRef = db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(carpetaSlot);

    try {
        const doc = await docRef.get();
        let data = doc.exists ? doc.data() : { nombre: "", cartas: [] };
        let lista = data.cartas || [];

        const index = lista.findIndex(item => item.id === cartaId);

        if (index > -1) {
            lista[index].cant += 1;
        } else {
            lista.push({ id: cartaId, cant: 1 });
        }

        await docRef.set({ cartas: lista }, { merge: true });
        mostrarNotificacion(`Inscrita en ${nombreCarpeta}`, "✨");

    } catch (e) {
        console.error("Error al guardar en carpeta:", e);
        mostrarNotificacion("Fallo en la conexión astral", "❌");
    }
}

async function guardarEnCarpeta(id) {
    if (!usuarioActual) return;
    const docRef = db.collection('carpetas').doc(usuarioActual.uid);
    try {
        const doc = await docRef.get();
        let lista = doc.exists ? doc.data().cartas || [] : [];
        if (lista.includes(id)) {
            lista = lista.filter(item => item !== id);
            mostrarNotificacion("Carta desterrada.", "🗑️");
        } else {
            lista.push(id);
            mostrarNotificacion("Carta inscrita.", "✨");
        }
        await docRef.set({ cartas: lista });
        
        if (window.location.pathname.includes('grimorio.html')) {
            const nuevasCartasUsuario = cartasMyL.filter(c => lista.includes(c.ID));
            dibujarCartas(nuevasCartasUsuario);
            filtrarCartas();
        } else {
            filtrarCartas();
        }
    } catch (e) { console.error(e); }
}

// ==========================================
// 8. EVENT LISTENERS Y UTILIDADES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnClose = document.getElementById('close-detail');
    if (btnClose) {
        btnClose.onclick = () => {
            if (panel) panel.classList.remove('active');
        };
    }

    if (buscador) buscador.addEventListener('input', filtrarCartasOptimizado);
    
    document.getElementById('filter-coste')?.addEventListener('input', filtrarCartas);
    document.getElementById('filter-fuerza')?.addEventListener('input', filtrarCartas);
    
    document.querySelectorAll('.sidebar input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', filtrarCartas);
    });

    if (document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').onclick = () => {
            mostrarNotificacion("Tu esencia abandona el Grimorio...", "🌑");
            setTimeout(() => { auth.signOut().then(() => { window.location.href = 'index.html'; }); }, 2000);
        };
    }

    const searchInput = document.getElementById('main-search');
    const clearBtn = document.getElementById('clear-search');

    if (searchInput && clearBtn) {
        searchInput.addEventListener('input', () => {
            clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.focus();
            if (typeof filtrarCartas === 'function') {
                filtrarCartas(); 
            }
        });
    }

    const btnEdit = document.getElementById('btn-edit-profile');
    const viewWrapper = document.getElementById('perfil-view-wrapper');
    const editForm = document.getElementById('perfil-edit-form');
    const btnCancel = document.getElementById('btn-cancel-edit');

    if (btnEdit && viewWrapper && editForm) {
        btnEdit.onclick = async () => {
            if (!usuarioActual) return;
            const doc = await db.collection('usuarios').doc(usuarioActual.uid).get();
            if (doc.exists) {
                const d = doc.data();
                document.getElementById('edit-realname').value = d.nombreReal || "";
                document.getElementById('edit-nickname').value = d.nickname || "";
                document.getElementById('edit-birth').value = d.fechaNacimiento || "";
                document.getElementById('edit-sexo').value = d.sexo || "MÍSTICO";
                document.getElementById('edit-bio').value = d.descripcion || "";
            }
            viewWrapper.style.display = 'none';
            editForm.style.display = 'flex';
        };
    }

    if (btnCancel && viewWrapper && editForm) {
        btnCancel.onclick = () => {
            viewWrapper.style.display = 'flex';
            editForm.style.display = 'none';
        };
    }
});

async function cargarTarjetaInvocador(uid) {
    const doc = await db.collection('usuarios').doc(uid).get();
    if (doc.exists) {
        const data = doc.data();
        const nicknameFinal = data.nickname || "GLADIADOR";
        if (document.getElementById('card-nick-display')) document.getElementById('card-nick-display').innerText = nicknameFinal;
        if (document.getElementById('display-name-text')) document.getElementById('display-name-text').innerText = nicknameFinal;
        if (document.getElementById('card-desc-display')) document.getElementById('card-desc-display').innerText = data.descripcion || "";
        
        if (document.getElementById('card-real-name-display')) document.getElementById('card-real-name-display').innerText = data.nombreReal || "";
        if (document.getElementById('card-birth-display')) document.getElementById('card-birth-display').innerText = data.fechaNacimiento || "";
        if (document.getElementById('card-sexo-display')) document.getElementById('card-sexo-display').innerText = data.sexo || "";

        const rangeDisplay = document.getElementById('invocador-rango');
        if (rangeDisplay) rangeDisplay.innerText = `RANGO: ${data.rango || "INICIADO"}`;
        if (data.photoCustom) {
            cargarImagenSegura('profile-img-large', data.photoCustom);
            cargarImagenSegura('user-photo', data.photoCustom);
        }
    }
}

async function actualizarPerfil() {
    if (!usuarioActual) return;

    const datos = {
        nombreReal: document.getElementById('edit-realname').value,
        nickname: document.getElementById('edit-nickname').value,
        fechaNacimiento: document.getElementById('edit-birth').value,
        sexo: document.getElementById('edit-sexo').value,
        descripcion: document.getElementById('edit-bio').value,
        rango: "INICIADO",
        ultimaConexion: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('usuarios').doc(usuarioActual.uid).set(datos, { merge: true });
        mostrarNotificacion("Tu esencia ha sido grabada en el Reino", "🛡️");
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (error) {
        console.error("Error detallado:", error);
        mostrarNotificacion("Fallo en la conexión astral", "❌");
    }
}

function mostrarNotificacion(mensaje, icono = '📖') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notificacion mostrar';
    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function cargarImagenSegura(elementoId, url) {
    const img = document.getElementById(elementoId);
    if (!img) return;
    img.classList.add('avatar-loading');
    const tempImg = new Image();
    tempImg.src = url;
    tempImg.onload = () => {
        img.src = url;
        img.classList.remove('avatar-loading');
        img.classList.add('avatar-loaded');
    };
    tempImg.onerror = () => {
        img.src = 'img/avatar-default.png';
        img.classList.add('avatar-loaded');
    };
}

function revisarParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    const edicion = params.get('edicion');
    if (edicion) {
        const check = document.querySelector(`input[value="${edicion}"]`);
        if (check) { check.checked = true; filtrarCartas(); }
    }
}

cargarGrimorio();