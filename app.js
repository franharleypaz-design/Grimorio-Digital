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
// 4. GESTIÓN DE SESIÓN (AUTH)
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

        // Lógica de Perfil
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
        if (esRutaPrivada) window.location.href = 'index.html';
        
        if (loginBtn) {
            loginBtn.style.setProperty('display', 'inline-block', 'important');
            loginBtn.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        }
        if (userSection) userSection.style.display = 'none';
    }
});

// ==========================================
// 5. FUNCIONES DE CARPETAS (FIREBASE)
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
            lista.push({ id: cartaId, cant: 1, favorito: false });
        }

        await docRef.set({ cartas: lista }, { merge: true });
        mostrarNotificacion(`Inscrita en ${nombreCarpeta}`, "✨");

    } catch (e) {
        console.error("Error al guardar en carpeta:", e);
        mostrarNotificacion("Fallo en la conexión astral", "❌");
    }
}

// ==========================================
// 6. PERFIL Y UTILIDADES
// ==========================================
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
        ultimaConexion: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('usuarios').doc(usuarioActual.uid).set(datos, { merge: true });
        mostrarNotificacion("Tu esencia ha sido grabada", "🛡️");
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        mostrarNotificacion("Error al actualizar perfil", "❌");
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
    img.src = url;
}

// Logout Global
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        auth.signOut().then(() => { window.location.href = 'index.html'; });
    };
}

// Ejecución inicial
cargarGrimorio();