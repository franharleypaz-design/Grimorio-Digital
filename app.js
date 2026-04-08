// 1. CONFIGURACIÓN FIREBASE
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

// 2. VARIABLES GLOBALES
let cartasMyL = []; 
let usuarioActual = null;
let modoCarpeta = false;
let saludoRealizado = false;

const display = document.getElementById('card-display');
const count = document.getElementById('card-count');
const buscador = document.getElementById('main-search');
const panel = document.getElementById('card-detail-panel');

// 3. NAVEGACIÓN
function irABiblioteca() {
    document.getElementById('home-portal').style.display = 'none';
    document.getElementById('main-library').style.display = 'flex';
    filtrarCartas();
}

function filtrarPorEdicion(edicion) {
    document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(i => i.checked = false);
    const target = document.querySelector(`input[value="${edicion}"]`);
    if(target) target.checked = true;
    irABiblioteca();
}

function toggleFiltros() {
    document.getElementById('sidebar').classList.toggle('active');
}

// 4. CARGAR DATOS (CORREGIDO PARA TU JSON)
async function cargarGrimorio() {
    try {
        const respuesta = await fetch('cartas.json');
        const data = await respuesta.json();
        // Accedemos a la clave exacta que generó el Excel
        cartasMyL = data["Carga Masiva de Cartas Excel a "]; 
        console.log("Grimorio cargado con éxito");
    } catch (error) { 
        console.error("Error cargando grimorio:", error); 
    }
}

// 5. FILTRADO
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
        
        // Ajuste para que coincida con el formato del JSON (usando replace para guiones)
        const edicionFormateada = c.Carpeta_Edicion.toLowerCase().replace(/_/g, '-');
        const matchEdicion = ediciones.length === 0 || ediciones.includes(edicionFormateada);
        
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
        div.innerHTML = `<img src="${rutaImg}" alt="${c.Nombre}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x280?text=Sin+Imagen'">`;
        div.onclick = () => mostrarDetalle(c, rutaImg);
        display.appendChild(div);
    });
}

// 6. DETALLE DE CARTA (CORREGIDO PARA VISUALIZACIÓN)
function mostrarDetalle(c, ruta) {
    document.getElementById('detail-img').src = ruta;
    document.getElementById('detail-name').innerText = c.Nombre;
    
    const stats = c.Tipo.toLowerCase() === 'aliado' ? ` | C:${c.Coste} F:${c.Fuerza}` : ` | C:${c.Coste}`;
    document.getElementById('detail-type').innerText = `${c.Tipo.toUpperCase()} ${c.Raza ? '- ' + c.Raza : ''}${stats}`;
    
    let btnSave = "";
    if (usuarioActual) {
        btnSave = `<button onclick="guardarEnCarpeta('${c.ID}')" class="btn-save-card" style="width:100%; margin-top:10px; padding:12px; background:var(--accent); border:none; font-weight:bold; cursor:pointer; border-radius:5px; color:black;">📜 GUARDAR EN EL GRIMORIO</button>`;
    }

    document.getElementById('detail-text').innerHTML = `
        <div style="font-style:italic; line-height:1.5;">${c.Habilidad || "Sin habilidad especial."}</div>
        ${btnSave}
        <p style="margin-top:20px; color:#888; font-size:0.8rem;">Ilustrador: ${c.Ilustrador}</p>
    `;
    panel.classList.add('active');
}

// 7. CARPETA / GRIMORIO
function toggleCarpeta() {
    if (!usuarioActual) return;
    modoCarpeta = true;
    document.getElementById('sidebar').style.display = 'none';
    const nombreUsuario = usuarioActual.displayName ? usuarioActual.displayName.split(' ')[0].toUpperCase() : "DEL GLADIADOR";
    document.getElementById('folder-title').innerText = `EL GRIMORIO DE ${nombreUsuario}`;
    document.getElementById('folder-header').style.display = 'flex';
    filtrarCartas();
}

function salirDeCarpeta() {
    modoCarpeta = false;
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('folder-header').style.display = 'none';
    filtrarCartas();
}

async function guardarEnCarpeta(id) {
    const docRef = db.collection('carpetas').doc(usuarioActual.uid);
    try {
        const doc = await docRef.get();
        let lista = doc.exists ? doc.data().cartas || [] : [];
        if (lista.includes(id)) {
            lista = lista.filter(item => item !== id);
            mostrarNotificacion("Carta desterrada del Grimorio.", "🗑️");
        } else {
            lista.push(id);
            mostrarNotificacion("Carta inscrita en el Grimorio.", "✨");
        }
        await docRef.set({ cartas: lista });
        if(modoCarpeta) filtrarCartas();
    } catch (e) { console.error(e); }
}

async function cambiarNick() {
    if (!usuarioActual) return;
    const nuevoNick = prompt("¿Cómo quieres ser conocido en el Reino?", usuarioActual.displayName);
    if (nuevoNick && nuevoNick.trim() !== "") {
        try {
            await auth.currentUser.updateProfile({ displayName: nuevoNick });
            document.getElementById('display-name-text').innerText = nuevoNick;
            mostrarNotificacion("Tu identidad ha sido actualizada.", "🖋️");
        } catch (e) { console.error(e); }
    }
}

// 8. AUTHENTICATION

auth.onAuthStateChanged(user => {
    const loginBtn = document.getElementById('btn-login');
    const userSection = document.getElementById('user-logged');
    const folderBtn = document.getElementById('btn-view-folder');
    
    // Si el usuario entra
    if (user) {
        // Solo lanzamos notificaciones y cambios visuales si es la primera vez que detectamos el login
        if (!usuarioActual) { 
            const nombre = user.displayName ? user.displayName.split(' ')[0] : "Gladiador";
            setTimeout(() => { mostrarNotificacion(`¡Bienvenido, ${nombre}!`, "⚔️"); }, 1000);
            
            // Actualizamos la interfaz
            if(loginBtn) loginBtn.style.display = 'none';
            if(userSection) userSection.style.display = 'flex';
            if(folderBtn) folderBtn.style.display = 'block';
            document.getElementById('display-name-text').innerText = user.displayName || "Gladiador";
            document.getElementById('user-photo').src = user.photoURL;
        }
        usuarioActual = user; // Guardamos la sesión

    } else {
        // Si el usuario sale (o no hay sesión)
        // SOLO recargamos si ANTES había un usuario (es decir, acaba de presionar Salir)
        if (usuarioActual) {
            mostrarNotificacion("Has abandonado el Reino...", "🌙");
            usuarioActual = null; // Limpiamos la variable PRIMERO
            saludoRealizado = false;

            // Esperamos un poco para que lea el mensaje y recargamos
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            // Si entra como invitado (sin haber sesión previa), solo nos aseguramos de que los botones estén bien
            if(loginBtn) loginBtn.style.display = 'block';
            if(userSection) userSection.style.display = 'none';
            if(folderBtn) folderBtn.style.display = 'none';
            usuarioActual = null;
        }
    }
});


// 9. LISTENERS
document.getElementById('btn-login').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
};

document.getElementById('btn-logout').onclick = () => auth.signOut();
document.getElementById('close-detail').onclick = () => panel.classList.remove('active');

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
    irABiblioteca();
    mostrarDetalle(c, `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`);
}

// 10. NOTIFICACIONES
function mostrarNotificacion(mensaje, icono = '📖') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast-notificacion';
    toast.innerHTML = `<span class="toast-icon">${icono}</span><span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('mostrar'), 100);
    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Inicializar
cargarGrimorio();


// --- CÓDIGO DE RASTREO DE EMERGENCIA ---
async function generarReporteFaltantes() {
    // Esperamos 3 segundos para asegurar que el JSON cargó
    setTimeout(() => {
        if (cartasMyL.length === 0) {
            alert("El Grimorio está vacío. Revisa la carga del JSON.");
            return;
        }

        let idsPresentes = cartasMyL.map(c => {
            let num = c.ID.match(/\d+/); 
            return num ? parseInt(num[0]) : null;
        }).filter(n => n !== null);

        let faltantes = [];
        for(let i=1; i <= 236; i++) {
            if(!idsPresentes.includes(i)) {
                faltantes.push("ES-" + i.toString().padStart(3, '0'));
            }
        }

        // Creamos un mensaje para mostrar en pantalla
        let mensaje = "--- REPORTE DEL REINO ---\n\n";
        mensaje += "Cartas detectadas: " + cartasMyL.length + "\n";
        mensaje += "IDs faltantes: " + (faltantes.length > 0 ? faltantes.join(", ") : "¡Ninguno!") + "\n\n";
        mensaje += "Revisa si estos IDs están mal escritos en el Excel.";

        console.log(mensaje);
        alert(mensaje); // Esto hará que salte una ventana en tu navegador
    }, 3000); 
}

// Ejecutar el reporte
generarReporteFaltantes();
