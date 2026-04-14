// ==========================================
// PERFIL.JS - LÓGICA DE LA TARJETA DE INVOCADOR
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECTORES DE INTERFAZ PARA EL FORMULARIO
    const btnEdit = document.getElementById('btn-edit-profile');
    const viewWrapper = document.getElementById('perfil-view-wrapper');
    const editForm = document.getElementById('perfil-edit-form');
    const btnCancel = document.getElementById('btn-cancel-edit');

    if (btnEdit && viewWrapper && editForm) {
        btnEdit.onclick = async () => {
            // Usamos firebase.auth().currentUser para asegurar el acceso al objeto
            const user = firebase.auth().currentUser;
            if (!user) return;

            const doc = await db.collection('usuarios').doc(user.uid).get();
            if (doc.exists) {
                const d = doc.data();
                document.getElementById('edit-realname').value = d.nombreReal || "";
                document.getElementById('edit-nickname').value = d.nickname || "";
                document.getElementById('edit-birth').value = d.fechaNacimiento || "";
                document.getElementById('edit-sexo').value = d.sexo || "MÍSTICO";
                document.getElementById('edit-bio').value = d.descripcion || "";
            }
            viewWrapper.style.display = 'none';
            editForm.style.display = 'block'; 
        };
    }

    if (btnCancel && viewWrapper && editForm) {
        btnCancel.onclick = () => {
            viewWrapper.style.display = 'flex';
            editForm.style.display = 'none';
        };
    }

    // 2. OBSERVADOR DE SESIÓN (SOLUCIONA LA CÁPSULA INVISIBLE)
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Invocador en el Santuario:", user.uid);
            gestionarInterfazLogueado(user);
            cargarDatosPerfilCompleto(user.uid);
        } else {
            // Si no hay sesión, mostramos botón ASCENDER
            if (document.getElementById('btn-login')) document.getElementById('btn-login').style.display = 'block';
            if (document.getElementById('user-logged')) document.getElementById('user-logged').style.display = 'none';
        }
    });
});

// Función para forzar la aparición de la cápsula superior
function gestionarInterfazLogueado(user) {
    const btnLogin = document.getElementById('btn-login');
    const userLogged = document.getElementById('user-logged');
    const displayNameText = document.getElementById('display-name-text');

    if (btnLogin) btnLogin.style.display = 'none';
    if (userLogged) {
        userLogged.style.display = 'flex'; // Activa la cápsula
        if (displayNameText) {
            displayNameText.innerText = user.displayName || "Invocador";
        }
    }
}

// ==========================================
// CARGA DE DATOS Y REGISTROS
// ==========================================
async function cargarDatosPerfilCompleto(uid) {
    const doc = await db.collection('usuarios').doc(uid).get();
    if (doc.exists) {
        const data = doc.data();
        
        // 1. Datos Básicos
        const nick = data.nickname || "INVOCADOR";
        if (document.getElementById('card-nick-display')) {
            document.getElementById('card-nick-display').innerText = nick.toUpperCase();
        }
        if (document.getElementById('card-desc-display')) {
            document.getElementById('card-desc-display').innerText = data.descripcion || "Sin leyenda aún...";
        }
        if (document.getElementById('invocador-rango')) {
            document.getElementById('invocador-rango').innerText = `RANGO: ${data.rango || "INICIADO"}`;
        }

        // Actualizar fotos en todas las interfaces
        if (data.photoCustom) {
            const fotos = [
                'profile-img-large',
                'user-photo',
                'user-photo-large-dropdown'
            ];
            fotos.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.src = data.photoCustom;
            });
        }

        // 2. Cargar Registros (Mazos y Carpetas)
        actualizarListaRegistros(uid);
    }
}

async function actualizarListaRegistros(uid) {
    const containerMazo = document.getElementById('main-deck-container');
    const containerCarpeta = document.getElementById('featured-folder-container');
    const containerCopias = document.getElementById('copied-decks-container');

    if (!containerMazo || !containerCarpeta || !containerCopias) return;

    containerMazo.innerHTML = "";
    containerCarpeta.innerHTML = "";
    containerCopias.innerHTML = "";

    try {
        const slotsRef = db.collection('usuarios').doc(uid).collection('slots');
        const querySnapshot = await slotsRef.get();
        
        // 1. MAZO PRINCIPAL (mazo1 por defecto)
        containerMazo.innerHTML = crearHTMLItemRegistro("ESTRATEGIA ALFA", "mazo1", "constructor.html");

        // 2. CARPETA DESTACADA (carpeta1 por defecto)
        containerCarpeta.innerHTML = crearHTMLItemRegistro("TESOROS DEL CAOS", "carpeta1", "grimorio.html");

        // 3. MAZOS COPIADOS
        let hayCopias = false;
        querySnapshot.forEach((doc) => {
            if (doc.id.includes('copia')) {
                hayCopias = true;
                containerCopias.innerHTML += crearHTMLItemRegistro("CRÓNICA COPIADA", doc.id, "constructor.html");
            }
        });

        if (!hayCopias) {
            containerCopias.innerHTML = '<p style="color:#555; font-size:0.7rem; font-style:italic;">No hay registros vinculados.</p>';
        }

    } catch (e) {
        console.error("Error cargando registros:", e);
    }
}

function crearHTMLItemRegistro(titulo, id, destino) {
    return `
        <div class="folder-item" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; border: 1px solid rgba(212,175,55,0.2);">
            <div class="folder-info">
                <small style="color: #d4af37; font-size: 0.6rem; text-transform: uppercase;">${id}</small>
                <span style="display:block; color: #eee; font-family: 'Cinzel', serif; font-size: 0.8rem;">${titulo}</span>
            </div>
            <button class="btn-dorado-perfil" style="width: auto; padding: 5px 15px; font-size: 0.6rem;" onclick="location.href='${destino}?slot=${id}'">ABRIR</button>
        </div>
    `;
}

// ==========================================
// FUNCIÓN ACTUALIZAR PERFIL (BOTÓN VINCULAR)
// ==========================================
async function actualizarPerfil() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const nuevosDatos = {
        nombreReal: document.getElementById('edit-realname').value,
        nickname: document.getElementById('edit-nickname').value,
        fechaNacimiento: document.getElementById('edit-birth').value,
        sexo: document.getElementById('edit-sexo').value,
        descripcion: document.getElementById('edit-bio').value
    };

    try {
        await db.collection('usuarios').doc(user.uid).update(nuevosDatos);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion("Esencia Vinculada", "📜");
        }
        
        await cargarDatosPerfilCompleto(user.uid);
        document.getElementById('btn-cancel-edit').click(); 
    } catch (error) {
        console.error("Error al actualizar:", error);
    }
}

// ==========================================
// FUNCIONES DE GALERÍA
// ==========================================
function abrirGaleria() {
    const modal = document.getElementById('modal-galeria');
    if (modal) modal.style.display = 'block';
}

function cerrarGaleria() {
    const modal = document.getElementById('modal-galeria');
    if (modal) modal.style.display = 'none';
}

async function seleccionarAvatar(url) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    try {
        await db.collection('usuarios').doc(user.uid).set({
            photoCustom: url
        }, { merge: true });

        document.getElementById('profile-img-large').src = url;
        if(document.getElementById('user-photo')) document.getElementById('user-photo').src = url;
        if(document.getElementById('user-photo-large-dropdown')) document.getElementById('user-photo-large-dropdown').src = url;
        
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion("Apariencia actualizada", "✨");
        }
        cerrarGaleria();
    } catch (error) {
        console.error("Error al cambiar avatar:", error);
    }
}