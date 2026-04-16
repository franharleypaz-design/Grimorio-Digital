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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. VARIABLES GLOBALES
// ==========================================
let cartasMyL = [];
let usuarioActual = null;

// ==========================================
// 3. NÚCLEO DE DATOS (JSON)
// ==========================================
async function cargarGrimorio() {
    if (cartasMyL.length > 0) return cartasMyL;
    try {
        const respuesta = await fetch('cartas.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar cartas.json");
        const data = await respuesta.json();
        const nombreClave = Object.keys(data).find(k => k.toLowerCase().includes("carga masiva"));
        if (nombreClave && data[nombreClave]) {
            cartasMyL = data[nombreClave];
            return cartasMyL;
        }
    } catch (error) {
        console.error("Error al leer el JSON principal:", error);
        return [];
    }
}

// ==========================================
// 4. GESTIÓN DE SESIÓN (AUTH) - OPTIMIZADA
// ==========================================
auth.onAuthStateChanged(async user => {
    const loginBtn = document.getElementById('btn-login');
    const userSection = document.getElementById('user-logged');
    const contenedorBoton = document.getElementById('contenedor-boton-santuario');
    
    // Rutas
    const rutasPrivadas = ['perfil.html', 'grimorio.html', 'constructor.html'];
    const esRutaPrivada = rutasPrivadas.some(p => window.location.pathname.includes(p));

    // Limpieza inicial de clases para evitar duplicados
    if (loginBtn) loginBtn.classList.remove('auth-ready');
    if (userSection) userSection.classList.remove('auth-ready');

    if (user) {
        usuarioActual = user;
        
        // 1. Ocultar login definitivamente
        if (loginBtn) loginBtn.style.display = 'none';
        
        // 2. Elementos de UI
        const nameHeader = document.getElementById('display-name-text');
        const fullNameMenu = document.getElementById('user-full-name');
        const emailMenu = document.getElementById('user-email');
        const photoSmall = document.getElementById('user-photo');
        const photoLarge = document.getElementById('user-photo-large');

        // 3. Carga rápida (Datos de Google)
        if (nameHeader) nameHeader.innerText = user.displayName || "Gladiador";
        if (fullNameMenu) fullNameMenu.innerText = user.displayName || "Gladiador";
        if (emailMenu) emailMenu.innerText = user.email;
        if (photoSmall) photoSmall.src = user.photoURL || 'img/avatar-default.png';
        if (photoLarge) photoLarge.src = user.photoURL || 'img/avatar-default.png';

        if (contenedorBoton) {
            contenedorBoton.innerHTML = `
                <button id="nav-santuario" onclick="location.href='grimorio.html'" class="btn-dorado-santuario">
                    ENTRAR AL SANTUARIO
                </button>`;
        }

        // 4. Sincronización con Firestore (Datos Personalizados)
        try {
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.nickname && nameHeader) nameHeader.innerText = data.nickname;
                if (data.nombreReal && fullNameMenu) fullNameMenu.innerText = data.nombreReal;
                if (data.photoCustom) {
                    if (photoSmall) photoSmall.src = data.photoCustom;
                    if (photoLarge) photoLarge.src = data.photoCustom;
                }
            }
        } catch (e) { console.warn("Error cargando perfil extendido:", e); }

        // 5. REVELAR interfaz de usuario logueado
        if (userSection) userSection.classList.add('auth-ready');

        if (window.location.pathname.includes('perfil.html')) {
            cargarTarjetaInvocador(user.uid);
        }
    } else {
        usuarioActual = null;
        if (contenedorBoton) contenedorBoton.innerHTML = "";
        
        if (esRutaPrivada) {
            window.location.href = 'index.html';
        } else {
            if (loginBtn) {
                loginBtn.style.display = 'inline-block';
                loginBtn.classList.add('auth-ready');
                loginBtn.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
            }
        }
    }
});

// ==========================================
// 5. FUNCIONES DE CARPETAS (FIREBASE)
// ==========================================
async function añadirACarpetaLibre(cartaId, carpetaSlot, nombreCarpeta) {
    if (!usuarioActual) {
        mostrarToast("Debes ascender primero", "🔒");
        return;
    }
    const docRef = db.collection('usuarios').doc(usuarioActual.uid).collection('slots').doc(carpetaSlot);

    try {
        const doc = await docRef.get();
        let lista = doc.exists ? (doc.data().cartas || []) : [];
        const index = lista.findIndex(item => item.id === cartaId);

        if (index > -1) {
            lista[index].cant += 1;
        } else {
            lista.push({ id: cartaId, cant: 1, favorito: false });
        }

        await docRef.set({ cartas: lista }, { merge: true });
        mostrarToast(`Inscrita en ${nombreCarpeta}`, "✨");
    } catch (e) {
        console.error("Error al guardar:", e);
        mostrarToast("Fallo en la conexión astral", "❌");
    }
}

// ==========================================
// 6. PERFIL Y UTILIDADES
// ==========================================
async function cargarTarjetaInvocador(uid) {
    try {
        const doc = await db.collection('usuarios').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            const fields = {
                'card-nick-display': data.nickname || "GLADIADOR",
                'card-desc-display': data.descripcion || "",
                'card-real-name-display': data.nombreReal || "",
                'card-birth-display': data.fechaNacimiento || "",
                'card-sexo-display': data.sexo || "",
                'invocador-rango': `RANGO: ${data.rango || "INICIADO"}`
            };

            for (let id in fields) {
                const el = document.getElementById(id);
                if (el) el.innerText = fields[id];
            }
            
            if (data.photoCustom) {
                ['profile-img-large', 'user-photo', 'user-photo-large'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.src = data.photoCustom;
                });
            }
        }
    } catch (e) { console.error("Error cargando tarjeta:", e); }
}

async function actualizarPerfil() {
    if (!usuarioActual) return;
    const datos = {
        nombreReal: document.getElementById('edit-realname').value,
        nickname: document.getElementById('edit-nickname').value,
        fechaNacimiento: document.getElementById('edit-birth').value,
        sexo: document.getElementById('edit-sexo').value,
        descripcion: document.getElementById('edit-bio').value,
        ultimaConexion: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('usuarios').doc(usuarioActual.uid).set(datos, { merge: true });
        mostrarToast("Tu esencia ha sido grabada", "🛡️");
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        mostrarToast("Error al actualizar perfil", "❌");
    }
}

function mostrarToast(mensaje, icono = '📖') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast mostrar';
    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ==========================================
// 7. LÓGICA DE FILTROS ALEATORIOS (PORTAL)
// ==========================================
async function inyectarCartasAleatoriasPortal() {
    const cartas = await cargarGrimorio();
    if (!cartas || cartas.length === 0) return;

    const poolPE = cartas.filter(c => c.Bloque === "primera_era");
    const poolB1 = cartas.filter(c => c.Bloque === "primer_bloque");

    if (poolPE.length > 0) {
        const randomPE = poolPE[Math.floor(Math.random() * poolPE.length)];
        const peCard = document.querySelector('.item-1');
        if (peCard) peCard.style.backgroundImage = `url('img/cartas/${randomPE.Bloque}/${randomPE.Carpeta_Edicion}/${randomPE.Imagen}')`;
    }

    if (poolB1.length > 0) {
        const randomPB = poolB1[Math.floor(Math.random() * poolB1.length)];
        const pbCard = document.querySelector('.item-2');
        if (pbCard) pbCard.style.backgroundImage = `url('img/cartas/${randomPB.Bloque}/${randomPB.Carpeta_Edicion}/${randomPB.Imagen}')`;
    }

    const libCard = document.querySelector('.item-3');
    if (libCard) libCard.style.backgroundImage = "url('img/Grimorio-Digital.jpg')";
}

// ==========================================
// 8. EVENTOS DE INTERFAZ GLOBAL
// ==========================================

// Logout Global
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.onclick = (e) => {
        e.preventDefault();
        auth.signOut().then(() => { window.location.href = 'index.html'; });
    };
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarGrimorio().then(() => {
        if (document.querySelector('.arte-cartas-contenedor')) {
            inyectarCartasAleatoriasPortal();
        }
    });
});