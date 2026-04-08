// CONFIGURACIÓN FIREBASE
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

// VARIABLES
let cartasMyL = []; 
let usuarioActual = null;
let modoCarpeta = false;

const display = document.getElementById('card-display');
const count = document.getElementById('card-count');
const buscador = document.getElementById('main-search');
const panel = document.getElementById('card-detail-panel');

// CARGAR DATOS
async function cargarGrimorio() {
    try {
        const respuesta = await fetch('cartas.json');
        cartasMyL = await respuesta.json();
        filtrarCartas();
    } catch (error) { console.error("Error cargando grimorio:", error); }
}

// FILTRADO
async function filtrarCartas() {
    const texto = buscador.value.toLowerCase();
    const raza = document.getElementById('raza-filter').value.toLowerCase();
    const costeMax = parseInt(document.getElementById('filter-coste').value);
    const fuerzaMin = parseInt(document.getElementById('filter-fuerza').value);
    
    const ediciones = Array.from(document.querySelectorAll('.filter-group input[type="checkbox"]'))
        .filter(i => i.checked && ["espada-sagrada", "helenica", "hijos-daana"].includes(i.value))
        .map(i => i.value);

    const tipos = Array.from(document.querySelectorAll('.filter-group input[type="checkbox"]'))
        .filter(i => i.checked && ["aliado", "talisman", "totem", "oro"].includes(i.value))
        .map(i => i.value);

    let idsGuardados = [];
    if (modoCarpeta && usuarioActual) {
        const doc = await db.collection('carpetas').doc(usuarioActual.uid).get();
        if (doc.exists) idsGuardados = doc.data().cartas || [];
    }

    const resultado = cartasMyL.filter(c => {
        if (modoCarpeta && !idsGuardados.includes(c.ID)) return false;

        const matchTexto = c.Nombre.toLowerCase().includes(texto) || (c.Habilidad && c.Habilidad.toLowerCase().includes(texto));
        const matchRaza = raza === "" || (c.Raza && c.Raza.toLowerCase() === raza);
        const matchEdicion = ediciones.length === 0 || ediciones.includes(c.Carpeta_Edicion.toLowerCase().replace('_', '-'));
        const matchTipo = tipos.length === 0 || tipos.includes(c.Tipo.toLowerCase());
        const numCoste = parseInt(c.Coste) || 0;
        const matchCoste = numCoste <= costeMax;
        const numFuerza = parseInt(c.Fuerza) || 0;
        const matchFuerza = (c.Tipo.toLowerCase() === 'aliado') ? numFuerza >= fuerzaMin : true;

        return matchTexto && matchRaza && matchEdicion && matchTipo && matchCoste && matchFuerza;
    });

    dibujarCartas(resultado);
}

function dibujarCartas(lista) {
    display.innerHTML = '';
    count.innerText = lista.length;
    lista.forEach(c => {
        const rutaImg = `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`;
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `<img src="${rutaImg}" alt="${c.Nombre}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x280?text=${c.ID}'">`;
        div.onclick = () => mostrarDetalle(c, rutaImg);
        display.appendChild(div);
    });
}

function mostrarDetalle(c, ruta) {
    document.getElementById('detail-img').src = ruta;
    document.getElementById('detail-name').innerText = c.Nombre;
    const stats = c.Tipo.toLowerCase() === 'aliado' ? ` | C:${c.Coste} F:${c.Fuerza}` : ` | C:${c.Coste}`;
    document.getElementById('detail-type').innerText = `${c.Tipo.toUpperCase()} ${c.Raza ? '- ' + c.Raza : ''}${stats}`;
    
    let btnSave = `<button onclick="guardarEnCarpeta('${c.ID}')" style="width:100%; margin-top:10px; padding:12px; background:var(--accent); border:none; font-weight:bold; cursor:pointer; border-radius:5px; color:black;">📜 GUARDAR EN EL GRIMORIO</button>`;

    document.getElementById('detail-text').innerHTML = `
        <div style="font-style:italic; line-height:1.5;">${c.Habilidad || c.Hability}</div>
        ${btnSave}
        <p style="margin-top:20px; color:#666; font-size:0.8rem;">Ilustrador: ${c.Ilustrador}</p>
    `;
    panel.classList.add('active');
}

// FUNCIONES CARPETA (EL GRIMORIO)
function toggleCarpeta() {
    if (!usuarioActual) {
        mostrarNotificacion("Debes invocar tu sesión primero", "👁️");
        return;
    }
    modoCarpeta = true;
    document.getElementById('sidebar').style.width = '0px';
    document.getElementById('sidebar').style.padding = '0px';
    document.getElementById('sidebar').style.overflow = 'hidden';
    
    // Título ñoño y dinámico
    const nombreUsuario = usuarioActual.displayName ? usuarioActual.displayName.split(' ')[0].toUpperCase() : "DEL GLADIADOR";
    document.getElementById('folder-header').innerHTML = `
        <h2 style="color: var(--accent); margin: 0; letter-spacing: 2px;">📖 EL GRIMORIO DE ${nombreUsuario}</h2>
        <button onclick="salirDeCarpeta()" style="background: var(--accent); color: black; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">← VOLVER AL REINO</button>
    `;
    
    document.getElementById('folder-header').style.display = 'flex';
    filtrarCartas();
}

function salirDeCarpeta() {
    modoCarpeta = false;
    document.getElementById('sidebar').style.width = '260px';
    document.getElementById('sidebar').style.padding = '25px';
    document.getElementById('sidebar').style.overflow = 'auto';
    document.getElementById('folder-header').style.display = 'none';
    filtrarCartas();
}

async function guardarEnCarpeta(id) {
    if (!usuarioActual) {
        mostrarNotificacion("¡Debes entrar con tu cuenta para guardar!", "❌");
        return;
    }
    const docRef = db.collection('carpetas').doc(usuarioActual.uid);
    try {
        const doc = await docRef.get();
        let lista = doc.exists ? doc.data().cartas || [] : [];
        
        if (lista.includes(id)) {
            lista = lista.filter(item => item !== id);
            mostrarNotificacion("Carta desterrada del Grimorio.", "🗑️");
        } else {
            lista.push(id);
            mostrarNotificacion("¡Carta inscrita en tu Grimorio!", "✨");
        }
        await docRef.set({ cartas: lista });
        if(modoCarpeta) filtrarCartas();
    } catch (e) { console.error(e); }
}

// AUTH
auth.onAuthStateChanged(user => {
    usuarioActual = user;
    document.getElementById('btn-login').style.display = user ? 'none' : 'block';
    document.getElementById('user-logged').style.display = user ? 'flex' : 'none';
    if(user) {
        const photo = document.getElementById('user-photo');
        photo.src = user.photoURL;
        photo.referrerPolicy = "no-referrer";
    }
});

document.getElementById('btn-login').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
};
document.getElementById('btn-logout').onclick = () => auth.signOut();
document.getElementById('close-detail').onclick = () => panel.classList.remove('active');

// LISTENERS
buscador.addEventListener('input', filtrarCartas);
document.getElementById('raza-filter').addEventListener('change', filtrarCartas);
document.querySelectorAll('input[type="checkbox"]').forEach(i => i.addEventListener('change', filtrarCartas));
document.getElementById('filter-coste').oninput = (e) => {
    document.getElementById('val-coste').innerText = e.target.value;
    filtrarCartas();
};
document.getElementById('filter-fuerza').oninput = (e) => {
    document.getElementById('val-fuerza').innerText = e.target.value;
    filtrarCartas();
};

function cartaAlAzar() {
    if (cartasMyL.length === 0) return;
    const c = cartasMyL[Math.floor(Math.random() * cartasMyL.length)];
    mostrarDetalle(c, `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`);
}

cargarGrimorio();

// --- FUNCIÓN PARA MOSTRAR NOTIFICACIONES BONITAS (TOAST) ---
function mostrarNotificacion(mensaje, icono = '📖') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-notificacion';
    toast.innerHTML = `
        <span class="toast-icon">${icono}</span>
        <span class="toast-mensaje">${mensaje}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('mostrar');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 4000);
}
