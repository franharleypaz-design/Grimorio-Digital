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

// Función Debounce para búsqueda fluida
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}
const filtrarCartasOptimizado = debounce(() => filtrarCartas());

// ==========================================
// 3. CARGAR DATOS (JSON)
// ==========================================
async function cargarGrimorio() {
    try {
        const respuesta = await fetch('cartas.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar cartas.json");

        const data = await respuesta.json();
        const nombreClave = Object.keys(data).find(k => k.toLowerCase().includes("carga masiva"));

        if (nombreClave && data[nombreClave]) {
            cartasMyL = data[nombreClave];

            if (display) dibujarCartas(cartasMyL);

            if (window.location.pathname.includes('biblioteca.html')) {
                modoCarpeta = false;
                filtrarCartas();
                revisarParametrosURL();
            } else if (window.location.pathname.includes('grimorio.html')) {
                modoCarpeta = true;
                setTimeout(() => filtrarCartas(), 800);
            }
        }
    } catch (error) {
        console.error("Error al leer el Grimorio:", error);
    }
}

// ==========================================
// 4. LÓGICA DE FILTRADO
// ==========================================
async function filtrarCartas() {
    if (!display || elementosCartasDOM.length === 0) return;

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

    let idsGuardados = [];
    if (modoCarpeta && usuarioActual) {
        const doc = await db.collection('carpetas').doc(usuarioActual.uid).get();
        if (doc.exists) idsGuardados = doc.data().cartas || [];
    }

    let contadorVisibles = 0;

    elementosCartasDOM.forEach(item => {
        const c = item.info;

        if (modoCarpeta && !idsGuardados.includes(c.ID)) {
            item.el.style.display = 'none';
            return;
        }

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
        div.onclick = () => mostrarDetalle(c, rutaImg);
        fragmento.appendChild(div);
        elementosCartasDOM.push({ info: c, el: div });
    });
    display.appendChild(fragmento);
}

function mostrarDetalle(c, ruta) {
    if (!panel) return;
    
    // 1. Imagen y Nombre
    document.getElementById('detail-img').src = ruta;
    document.getElementById('detail-name').innerText = c.Nombre;

    // 2. Tipo y Stats
    let stats = c.Tipo.toLowerCase().includes('aliado') ? ` | C:${c.Coste} F:${c.Fuerza}` : ` | C:${c.Coste || 0}`;
    document.getElementById('detail-type').innerText = `${c.Tipo.toUpperCase()} ${c.Raza ? '- ' + c.Raza : ''}${stats}`;

    // 3. Referencias Técnias (ID y Edición)
    if (document.getElementById('detail-id')) document.getElementById('detail-id').innerText = c.ID;
    if (document.getElementById('detail-edition')) {
        document.getElementById('detail-edition').innerText = c.Edicion.toUpperCase();
    }

    // 4. Habilidad
    document.getElementById('detail-text').innerHTML = `<div style="font-style:italic;">${c.Habilidad || "Sin habilidad."}</div>`;

    // 5. Botón de Guardado
    const btnContainer = document.getElementById('save-button-container');
    if (btnContainer) {
        btnContainer.innerHTML = "";
        if (usuarioActual) {
            const textoBoton = modoCarpeta ? "🗑️ QUITAR DEL GRIMORIO" : "📜 GUARDAR EN EL GRIMORIO";
            const btn = document.createElement('button');
            btn.className = "btn-save-card";
            btn.innerText = textoBoton;
            btn.onclick = (e) => { e.stopPropagation(); guardarEnCarpeta(c.ID); };
            btnContainer.appendChild(btn);
        }
    }

    // 6. Ilustrador
    if (document.getElementById('detail-illustrator')) {
        document.getElementById('detail-illustrator').innerText = `Ilustrador: ${c.Ilustrador}`;
    }

    // 7. Lógica de Cartas Referenciales (Botones por ID)
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
                        panel.scrollTop = 0;
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
auth.onAuthStateChanged(user => {
    const loginBtn = document.getElementById('btn-login');
    const userSection = document.getElementById('user-logged');
    const esRutaPrivada = window.location.pathname.includes('perfil.html') || window.location.pathname.includes('grimorio.html');

    if (user) {
        usuarioActual = user;
        if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
        if (userSection) userSection.style.display = 'flex';

        if (window.location.pathname.includes('perfil.html')) {
            cargarTarjetaInvocador(user.uid);
        } else {
            const nameHeader = document.getElementById('display-name-text');
            db.collection('usuarios').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.photoCustom) cargarImagenSegura('user-photo', data.photoCustom);
                    if (data.nickname && nameHeader) nameHeader.innerText = data.nickname;
                }
            });
        }
    } else {
        usuarioActual = null;
        if (esRutaPrivada) window.location.href = 'index.html';
        if (loginBtn) {
            loginBtn.style.setProperty('display', 'inline-block', 'important');
            loginBtn.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        }
        if (userSection) userSection.style.display = 'none';
    }
});

// ==========================================
// 7. LÓGICA DE ASCENSO Y RANGOS
// ==========================================
async function intentarAscenso() {
    if (!usuarioActual) return;
    try {
        const doc = await db.collection('carpetas').doc(usuarioActual.uid).get();
        const totalCartas = doc.exists ? (doc.data().cartas || []).length : 0;

        let nuevoRango = "INICIADO";
        if (totalCartas >= 30) nuevoRango = "GUARDIÁN DEL GRIMORIO";
        else if (totalCartas >= 20) nuevoRango = "BUSCADOR DE LEYENDAS";
        else if (totalCartas >= 10) nuevoRango = "VIAJERO DE LOS MITOS";
        else {
            mostrarNotificacion(`Faltan ${10 - totalCartas} cartas para ascender`, "📜");
            return;
        }

        await db.collection('usuarios').doc(usuarioActual.uid).set({ rango: nuevoRango }, { merge: true });
        const rDisplay = document.getElementById('invocador-rango');
        if (rDisplay) rDisplay.innerText = `RANGO: ${nuevoRango}`;
        mostrarNotificacion(`¡Rango ${nuevoRango} alcanzado!`, "✨");
    } catch (e) { console.error(e); }
}

// ==========================================
// 8. FUNCIONES DEL GRIMORIO (FIREBASE)
// ==========================================
async function guardarEnCarpeta(id) {
    if (!usuarioActual) return;
    const docRef = db.collection('carpetas').doc(usuarioActual.uid);
    try {
        const doc = await docRef.get();
        let lista = doc.exists ? doc.data().cartas || [] : [];
        if (lista.includes(id)) {
            lista = lista.filter(item => item !== id);
            mostrarNotificacion("Carta desterrada.", "🗑️");
            if (panel) panel.classList.remove('active');
        } else {
            lista.push(id);
            mostrarNotificacion("Carta inscrita.", "✨");
        }
        await docRef.set({ cartas: lista });
        if (modoCarpeta) filtrarCartas();
    } catch (e) { console.error(e); }
}

// ==========================================
// 9. PERFIL, AVATARES Y EDICIÓN
// ==========================================
function activarModoEdicion() {
    const viewWrapper = document.getElementById('perfil-view-wrapper');
    const editForm = document.getElementById('perfil-edit-form');
    if (viewWrapper) viewWrapper.style.display = 'none';
    if (editForm) editForm.style.display = 'flex';
    document.getElementById('p-nickname').value = document.getElementById('card-nick-display').innerText;
    document.getElementById('p-descripcion').value = document.getElementById('card-desc-display').innerText;
}

function cancelarEdicion() {
    const editForm = document.getElementById('perfil-edit-form');
    const viewWrapper = document.getElementById('perfil-view-wrapper');
    if (editForm) editForm.style.display = 'none';
    if (viewWrapper) viewWrapper.style.display = 'flex';
}

async function cargarTarjetaInvocador(uid) {
    const doc = await db.collection('usuarios').doc(uid).get();
    if (doc.exists) {
        const data = doc.data();
        const nicknameFinal = data.nickname || "GLADIADOR";
        if (document.getElementById('card-nick-display')) document.getElementById('card-nick-display').innerText = nicknameFinal;
        if (document.getElementById('display-name-text')) document.getElementById('display-name-text').innerText = nicknameFinal;
        if (document.getElementById('card-desc-display')) document.getElementById('card-desc-display').innerText = data.descripcion || "";
        const rangeDisplay = document.getElementById('invocador-rango');
        if (rangeDisplay) rangeDisplay.innerText = `RANGO: ${data.rango || "INICIADO"}`;
        if (data.photoCustom) {
            cargarImagenSegura('profile-img-large', data.photoCustom);
            cargarImagenSegura('user-photo', data.photoCustom);
        }
    }
}

async function guardarDatosPerfil() {
    if (!usuarioActual) return;
    const datos = {
        nickname: document.getElementById('p-nickname').value.toUpperCase(),
        descripcion: document.getElementById('p-descripcion').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await db.collection('usuarios').doc(usuarioActual.uid).set(datos, { merge: true });
        mostrarNotificacion("Tu esencia ha sido reescrita.", "✨");
        cargarTarjetaInvocador(usuarioActual.uid);
        cancelarEdicion();
    } catch (error) { mostrarNotificacion("Fallo en la conexión astral.", "❌"); }
}

function abrirGaleria() { document.getElementById('modal-galeria').style.display = 'block'; }
function cerrarGaleria() { document.getElementById('modal-galeria').style.display = 'none'; }

async function seleccionarAvatar(url) {
    if (!usuarioActual) return;
    try {
        await db.collection('usuarios').doc(usuarioActual.uid).set({ photoCustom: url }, { merge: true });
        cargarImagenSegura('profile-img-large', url);
        cargarImagenSegura('user-photo', url);
        cerrarGaleria();
        mostrarNotificacion("Vínculo de esencia completado", "✨");
    } catch (error) { mostrarNotificacion("Error al vincular esencia", "❌"); }
}

// ==========================================
// 10. EVENT LISTENERS Y UTILIDADES
// ==========================================
if (buscador) buscador.addEventListener('input', filtrarCartasOptimizado);
document.querySelectorAll('.sidebar input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', filtrarCartas);
});
if (document.getElementById('btn-logout')) {
    document.getElementById('btn-logout').onclick = () => {
        mostrarNotificacion("Tu esencia abandona el Grimorio...", "🌑");
        setTimeout(() => { auth.signOut().then(() => { window.location.href = 'index.html'; }); }, 2000);
    };
}
if (document.getElementById('close-detail')) document.getElementById('close-detail').onclick = () => panel.classList.remove('active');

function mostrarNotificacion(mensaje, icono = '📖') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notificacion mostrar';
    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function revisarParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    const edicion = params.get('edicion');
    if (edicion) {
        const check = document.querySelector(`input[value="${edicion}"]`);
        if (check) { check.checked = true; filtrarCartas(); }
    }
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

cargarGrimorio();
