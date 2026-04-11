// ==========================================



// 1. VARIABLES DE ESTADO Y REGLAS



// ==========================================



const BLOQUES = {



    "primera-era": ["el_reto", "mundo_gotico", "la_ira_del_nahual", "ragnarok", "espiritu_de_dragon"],



    "segunda-era": ["espada_sagrada", "helenica", "hijos_de_daana", "dominios_de_ra"]



};







let mazoActual = [];



let slotId = "";
let esMazo = false; // Se definirá en el DOMContentLoaded



let faseOroInicial = true;







let configMazo = {



    bloque: "",



    formato: "",



    raza: ""



};







// ==========================================



// 2. INICIO Y CARGA



// ==========================================



document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    slotId = params.get('slot');

    if (!slotId) {
        window.location.href = 'grimorio.html';
        return;
    }

    // Unificamos la detección: si es mazo fijo O es una copia, se comporta como taller
    esMazo = slotId.includes('mazo') || slotId.startsWith('copia_');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioActual = user;
            await cargarDatosDelSlot();
            verificarYRenderizar(); // Asegúrate de que esta función exista abajo
        } else {
            window.location.href = 'index.html';
        }
    });

    document.getElementById('main-search')?.addEventListener('input', () => filtrarCartas());
    document.getElementById('tipo-filter')?.addEventListener('change', () => filtrarCartas());
    document.getElementById('raza-filter')?.addEventListener('change', () => filtrarCartas());
});





async function cargarDatosDelSlot() {
    try {
        const doc = await db.collection('usuarios').doc(usuarioActual.uid)
            .collection('slots').doc(slotId).get();

        if (doc.exists) {
            const data = doc.data();
            mazoActual = data.cartas || [];
            configMazo = data.config || { bloque: "", formato: "", raza: "" };

            // --- ACTUALIZACIÓN DINÁMICA DEL HEADER ---
            const displayNombre = document.getElementById('slot-id-display');
            if (displayNombre) {
                // Limpiamos el nombre para que no diga "COPIA:" dos veces
                const nombreLimpio = (data.nombre || "ESTRATEGIA").replace("COPIA:", "").trim().toUpperCase();
                
                if (slotId.startsWith('copia_')) {
                    const autor = (data.autorOriginal || "INVOCADOR").toUpperCase();
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span> | DE: ${autor}`;
                } else {
                    displayNombre.innerHTML = `MODO: <span style="color:var(--accent);">${nombreLimpio}</span>`;
                }
            }

            setearValoresInterfaz();

            // Liberar vista si hay cartas o si es una copia (que ya trae reglas)
            if (mazoActual.length > 0 || slotId.startsWith('copia_')) {
                liberarVistaMazoExistente();
            } else {
                actualizarSetup(true);
            }
        }
        renderizarMazo();
    } catch (e) { 
        console.error("Error en conexión astral:", e); 
    }
}

function verificarYRenderizar() {
    const reintento = setInterval(() => {
        if (typeof cartasMyL !== 'undefined' && cartasMyL.length > 0) {
            clearInterval(reintento);
            filtrarCartas();
            renderizarMazo(); 
        }
    }, 500);
}



// ==========================================



// 3. FLUJO DE REGLAS (CORRECCIÓN DE BLOQUEO)



// ==========================================



function actualizarSetup(esCargaInicial = false) {



    const selBloque = document.getElementById('select-bloque');



    const selFormato = document.getElementById('select-formato');



    const selRaza = document.getElementById('select-raza');



    const overlay = document.getElementById('lock-overlay');



    const sidebar = document.querySelector('.sidebar');







    if (!selBloque) return;







    if (!esCargaInicial && event && event.target.id === 'select-bloque') {



        selFormato.value = "";



        selRaza.value = "";



        configMazo.formato = "";



        configMazo.raza = "";



    }







    configMazo.bloque = selBloque.value;



    configMazo.formato = selFormato.value;



    configMazo.raza = selRaza.value;







    if (configMazo.bloque !== "") {



        selFormato.style.display = "inline-block";



    } else {



        selFormato.style.display = "none";



        selRaza.style.display = "none";



        bloquearSelectores(false);



        return;



    }







    if (configMazo.formato !== "") {



        if (configMazo.formato.includes('racial')) {



            selRaza.style.display = "inline-block";



        } else {



            selRaza.style.display = "none";



            configMazo.raza = "";



        }



    } else {



        selRaza.style.display = "none";



        return;



    }







    const requiereRaza = configMazo.formato.includes('racial');



    const bloqueOK = configMazo.bloque !== "";



    const formatoOK = configMazo.formato !== "";



    const razaOK = requiereRaza ? configMazo.raza !== "" : true;







    if (bloqueOK && formatoOK && razaOK) {



        bloquearSelectores(true);



        if (overlay) overlay.classList.add('unlocked');



        if (sidebar) sidebar.style.display = "block";







        const tieneOroIni = mazoActual.some(item => {



            const c = cartasMyL.find(x => x.ID === item.id);



            return c && c.Tipo.includes('Oro') && (!c.Habilidad || c.Habilidad.length < 5);



        });



        faseOroInicial = !tieneOroIni;



        filtrarCartas();



    } else {



        if (overlay) overlay.classList.remove('unlocked');



        if (sidebar) sidebar.style.display = "none";



    }



}







function bloquearSelectores(bloquear) {



    const contenedor = document.getElementById('setup-mazo');



    const instruction = document.getElementById('setup-instruction');



    const selectores = contenedor.querySelectorAll('select');



    const controlsRow = contenedor.querySelector('.setup-controls-row');







    const oldBtn = document.getElementById('btn-reset-rules');



    const oldResumen = document.getElementById('resumen-reglas');



    if (oldBtn) oldBtn.remove();



    if (oldResumen) oldResumen.remove();







    if (bloquear) {



        selectores.forEach(sel => sel.style.display = 'none');



        if (instruction) instruction.innerText = "SELLO DEL REINO ROTO - CARTAS LIBERADAS";







        const resumen = document.createElement('span');



        resumen.id = 'resumen-reglas';



        const txtBloque = configMazo.bloque.replace(/-/g, ' ');



        const txtRaza = configMazo.raza ? ` | ${configMazo.raza}` : '';



        resumen.innerText = `${txtBloque} | ${configMazo.formato}${txtRaza}`;







        resumen.style.color = 'var(--accent)';



        resumen.style.marginRight = '15px';



        resumen.style.paddingLeft = '15px';



        resumen.style.borderLeft = '2px solid var(--accent)';



        resumen.style.fontWeight = 'bold';



        resumen.style.textTransform = 'uppercase';



        resumen.style.fontFamily = "'Cinzel', serif";



        if (controlsRow) controlsRow.appendChild(resumen);







        const btnReset = document.createElement('button');



        btnReset.id = 'btn-reset-rules';



        btnReset.innerHTML = '<span>🔄</span> CAMBIAR REGLAS';



        btnReset.className = 'btn-cambiar-reglas';



        btnReset.onclick = resetearReglas;



        if (controlsRow) controlsRow.appendChild(btnReset);







    } else {



        if (instruction) instruction.innerText = "ESTABLECE LAS REGLAS DEL REINO PARA DESBLOQUEAR EL GRIMORIO";



        const b = document.getElementById('select-bloque');



        if (b) b.style.display = 'inline-block';



    }



}







function resetearReglas() {



    if (mazoActual.length > 0) {



        if (!confirm("Si cambias las reglas podrías invalidar las cartas ya elegidas. ¿Continuar?")) return;



    }



    configMazo = { bloque: "", formato: "", raza: "" };



    document.getElementById('select-bloque').value = "";



    document.getElementById('select-formato').value = "";



    document.getElementById('select-raza').value = "";



    bloquearSelectores(false);



    actualizarSetup(false);



}







// ==========================================



// 4. FILTRADO (LÓGICA DE OCULTAR BUSCADOR)



// ==========================================



// ==========================================

// 4. FILTRADO (LÓGICA DE VISIBILIDAD CORREGIDA)

// ==========================================

function filtrarCartas() {

    const display = document.getElementById('card-display');

    const sidebar = document.querySelector('.sidebar');

    if (!display || !cartasMyL || !configMazo.bloque) return;



    const edicionesPermitidas = BLOQUES[configMazo.bloque].map(e => e.toLowerCase().trim());



    let fuente = cartasMyL.filter(c => {

        const edicionNorm = (c.Carpeta_Edicion || "").toLowerCase().trim();

        return edicionesPermitidas.includes(edicionNorm);

    });



    if (faseOroInicial) {

        // REGLA: OCULTAR SIDEBAR TOTALMENTE

        if (sidebar) {

            sidebar.classList.add('sidebar-hidden');

            sidebar.style.display = "none"; // FUERZA DESAPARICIÓN

        }



        fuente = fuente.filter(c => {

            const tipo = (c.Tipo || "").toLowerCase();

            const habilidad = (c.Habilidad || "").trim().toLowerCase();

            const esOro = tipo.includes('oro');

            const sinHabilidadReal = habilidad === "" || habilidad === "-" || habilidad === "sin habilidad" || habilidad.length < 12;

            return esOro && sinHabilidadReal;

        });



        if (fuente.length === 0) {

            display.innerHTML = `<div class="lock-message" style="position:static; color: #ff6666; border:none;">NO SE ENCONTRARON OROS INICIALES LEGALES EN ESTE BLOQUE.</div>`;

            return;

        }

        mostrarNotificacion("ETAPA 1: ELIGE TU ORO INICIAL", "👑");

    } else {

        // REGLA: MOSTRAR SIDEBAR

        if (sidebar) {

            sidebar.classList.remove('sidebar-hidden');

            sidebar.style.display = "block"; // FUERZA APARICIÓN

            sidebar.style.visibility = "visible";

        }



        const busqueda = (document.getElementById('main-search')?.value || "").toLowerCase();

        const tipoFiltro = document.getElementById('tipo-filter')?.value || "";



        fuente = fuente.filter(c => {

            if (configMazo.formato.includes('racial') && (c.Tipo || "").includes('Aliado')) {

                if (c.Raza !== configMazo.raza) return false;

            }

            if (tipoFiltro && !(c.Tipo || "").includes(tipoFiltro)) return false;



            const nombre = (c.Nombre || "").toLowerCase();

            const hab = (c.Habilidad || "").toLowerCase();

            return nombre.includes(busqueda) || hab.includes(busqueda);

        });

    }

    dibujarCartasConstructor(fuente);

}







function dibujarCartasConstructor(lista) {



    const display = document.getElementById('card-display');



    display.innerHTML = "";



    lista.forEach(c => {



        const rutaImg = `img/cartas/${c.Bloque}/${c.Carpeta_Edicion}/${c.Imagen}`;



        const div = document.createElement('div');



        div.className = "card-item";



        div.innerHTML = `<img src="${rutaImg}" alt="${c.Nombre}" loading="lazy">`;



        div.onclick = () => añadirCarta(c.ID);



        display.appendChild(div);



    });



}







// ==========================================



// 5. ACCIONES



// ==========================================



function añadirCarta(id) {

    const carta = cartasMyL.find(c => c.ID === id);

    if (!carta) return;



    if (faseOroInicial) {

        // --- FASE 1: REGISTRO DE ORO INICIAL ---

        mazoActual.push({ id: id, cant: 1, favorito: false });

        faseOroInicial = false;

        mostrarNotificacion("ORO INICIAL REGISTRADO. BUSCADOR LIBERADO.", "⚔️");

       

        // Liberamos la interfaz y mostramos el resto de las cartas

        filtrarCartas();

    } else {

        // --- FASE 2: CONSTRUCCIÓN DEL MAZO (LÍMITE 49 ADICIONALES) ---

       

        // Calculamos el total de cartas en el mazo EXCLUYENDO exactamente UNA unidad de Oro Inicial

        let tieneOroYa = false;

        const totalCastilloActual = mazoActual.reduce((acc, item) => {

            const infoC = cartasMyL.find(c => c.ID === item.id);

            if (!infoC) return acc;



            const textoHab = (infoC.Habilidad || "").trim();

            const esOroBasico = infoC.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;

           

            // Si es el oro básico inicial, descontamos una unidad del conteo del castillo

            if (esOroBasico && !tieneOroYa) {

                tieneOroYa = true;

                return acc + (item.cant - 1); // La primera unidad no cuenta, las demás sí

            }

            return acc + item.cant;

        }, 0);



        // Bloqueo al llegar a 49 (Total 50 con el Oro Inicial)

        if (totalCastilloActual >= 49) {

            mostrarNotificacion("ESTRATEGIA COMPLETA (50 CARTAS).", "✅");

            return;

        }



        const itemEnMazo = mazoActual.find(item => item.id === id);

        if (itemEnMazo) {

            const hab = (carta.Habilidad || "").toLowerCase();

           

            // VALIDACIONES DE REGLAS

            // 1. Cartas Únicas

            if (hab.includes("única") || hab.includes("unica")) {

                mostrarNotificacion("ESTA CARTA ES ÚNICA.", "⚠️");

                return;

            }

           

            // 2. Límite de 3 copias (excepto Mercenarios o el Oro Inicial propiamente tal)

            const tipoLower = (carta.Tipo || "").toLowerCase();

            if (!hab.includes("mercenario") && !tipoLower.includes("oro") && itemEnMazo.cant >= 3) {

                mostrarNotificacion("MÁXIMO 3 COPIAS POR CARTA.", "⚠️");

                return;

            }



            itemEnMazo.cant++;

        } else {

            // Nueva carta al mazo

            mazoActual.push({ id: id, cant: 1, favorito: false });

        }

    }

   

    // Actualizamos la interfaz, contadores y estadísticas en tiempo real

    renderizarMazo();

}





function renderizarMazo() {



    const container = document.getElementById('deck-list-container');



    if (!container) return;



    container.innerHTML = "";







    let totalCastillo = 0;



    let tieneOroIni = false;



    let nombreOroIni = "FALTA";



   



    let countAliados = 0, countOrosMazo = 0, countOtros = 0;



    let costes = { 0:0, 1:0, 2:0, 3:0, 4:0 };



    let sumaFuerza = 0, cuentaFuerza = 0;



    let razasMap = {};



    let motorRobo = 0, motorAnula = 0;







    mazoActual.forEach(item => {



        const info = cartasMyL.find(c => c.ID === item.id);



        if (!info) return;







        const textoHabilidad = (info.Habilidad || "").trim();



        const habLower = textoHabilidad.toLowerCase();



        const tipo = (info.Tipo || "").toLowerCase();



        const esOro = tipo.includes('oro');







        for (let i = 0; i < item.cant; i++) {



            // DETECCIÓN DEL ORO INICIAL (La primera unidad de oro básico que encuentre)



            if (esOro && !tieneOroIni && (textoHabilidad === "" || textoHabilidad === "-" || textoHabilidad.length < 30)) {



                tieneOroIni = true;



                nombreOroIni = info.Nombre;



                // Importante: No sumamos a totalCastillo porque es el "Slot 50"



            } else {



                // Suma al Castillo (Las 49 restantes)



                totalCastillo++;







                if (tipo.includes('aliado')) {



                    countAliados++;



                    sumaFuerza += (parseInt(info.Fuerza) || 0);



                    cuentaFuerza++;



                    if (info.Raza) {



                        const r = info.Raza.trim();



                        razasMap[r] = (razasMap[r] || 0) + 1;



                    }



                } else if (esOro) {



                    countOrosMazo++;



                } else {



                    countOtros++;



                }







                // Motores



                if (habLower.includes("roba") || habLower.includes("busca") || habLower.includes("mira") || habLower.includes("mazo castillo")) motorRobo++;



                if (habLower.includes("anula") || habLower.includes("destruye") || habLower.includes("destierra")) motorAnula++;







                // Curva (Solo para cartas que no son Oro)



                if (!esOro) {



                    let c = parseInt(info.Coste) || 0;



                    if (c > 4) c = 4;



                    costes[c]++;



                }



            }



        }







        // Renderizado visual de la lista



        const rutaImg = `img/cartas/${info.Bloque}/${info.Carpeta_Edicion}/${info.Imagen}`;



        const div = document.createElement('div');



        div.className = "deck-card-item";



        div.innerHTML = `



            <div class="mini-preview" style="background-image: url('${rutaImg}')"></div>



            <span class="deck-card-qty">${item.cant}x</span>



            <div class="deck-card-info"><strong>${info.Nombre}</strong></div>



            <button class="btn-qty-control" onclick="quitarCarta('${info.ID}')">-</button>



        `;



        container.appendChild(div);



    });







    // --- ACTUALIZACIÓN DE LA TARJETA (CÁLCULO FINAL) ---







    // 1. Mostrar estado del Oro Inicial en las stats superiores



    const elStatOroIni = document.getElementById('stat-oro-ini');



    if (elStatOroIni) {



        elStatOroIni.innerText = tieneOroIni ? "SÍ" : "NO";



        elStatOroIni.style.color = tieneOroIni ? "#f7ef8a" : "#ff6666";



    }







    // 2. Contadores individuales



    document.getElementById('total-aliados').innerText = countAliados;



    document.getElementById('total-oros').innerText = countOrosMazo;



    document.getElementById('total-otros').innerText = countOtros;







    // 3. TOTAL FINAL: Suma real Aliados + Oros Mazo + Otros + (1 si hay Oro Ini)



    const sumaTotalReal = countAliados + countOrosMazo + countOtros + (tieneOroIni ? 1 : 0);



   



    const elTotalCards = document.getElementById('total-cards');



    if (elTotalCards) {



        elTotalCards.innerText = `${sumaTotalReal} / 50`;



        elTotalCards.style.color = (sumaTotalReal >= 50) ? "#f7ef8a" : "#fff";



    }







    // --- ESTADÍSTICAS SECUNDARIAS ---



    document.getElementById('fuerza-promedio').innerText = cuentaFuerza > 0 ? (sumaFuerza / cuentaFuerza).toFixed(1) : "0";



    document.getElementById('stat-robo').innerText = motorRobo;



    document.getElementById('stat-anula').innerText = motorAnula;







    let maxRaza = "NINGUNA", maxVal = 0;



    for (let r in razasMap) { if(razasMap[r] > maxVal) { maxVal = razasMap[r]; maxRaza = r; } }



    document.getElementById('raza-predominante').innerText = maxRaza.toUpperCase();







    // Curva Visual (Ajuste de altura proporcional)



    for (let i = 0; i <= 4; i++) {



        const barra = document.getElementById(`bar-${i}`);



        if (barra) {



            // Multiplicamos por 200 para que las barras tengan presencia visual en el contenedor de 60px



            const porcentaje = totalCastillo > 0 ? (costes[i] / totalCastillo) * 200 : 0;



            barra.style.height = `${Math.min(porcentaje, 100)}%`;



        }



    }







    // Arquetipo



    let arquetipo = "ANALIZANDO...";



    if (totalCastillo > 10) {



        if (countAliados > 22) arquetipo = "AGRESIVO (AGGRO)";



        else if (motorAnula > 7 || countOtros > 18) arquetipo = "CONTROL / LENTITUD";



        else arquetipo = "MID-RANGE / EQUILIBRADO";



    }



    document.getElementById('arquetipo-sugerido').innerText = arquetipo;







    // Sello Inferior



    const oroStatus = document.getElementById('status-oro-inicial');



    if (oroStatus) {



        if (tieneOroIni) {



            oroStatus.innerText = (sumaTotalReal >= 50) ? "✅ ESTRATEGIA COMPLETA" : `🛡️ ORO INICIAL: ${nombreOroIni}`;



            oroStatus.style.background = "rgba(212, 175, 55, 0.2)";



            oroStatus.style.color = "#f7ef8a";



        } else {



            oroStatus.innerText = "❌ FALTA ORO SIN HABILIDAD";



            oroStatus.style.background = "rgba(255, 0, 0, 0.1)";



            oroStatus.style.color = "#ff6666";



        }



    }



}

function quitarCarta(id) {

    const indice = mazoActual.findIndex(item => item.id === id);

    if (indice > -1) {

        const info = cartasMyL.find(c => c.ID === id);

        if (!info) return;



        // 1. Identificamos si la carta que se va a quitar es un "Oro Inicial"

        // (Tipo oro y habilidad corta o inexistente)

        const textoHabilidad = (info.Habilidad || "").trim();

        const esOroIniPotencial = info.Tipo.toLowerCase().includes('oro') && textoHabilidad.length < 30;



        // 2. Verificamos si realmente es el Oro Inicial activo.

        // Si solo queda 1 unidad de esta carta y el sistema está en fase de construcción,

        // al quitarla activamos el "Modo Elección" nuevamente.

        if (esOroIniPotencial && !faseOroInicial) {

            // Solo reseteamos si es la ÚNICA copia de ese oro que actuaba como inicial

            // o si el usuario simplemente decidió borrarla.

            faseOroInicial = true;

           

            // Limpiamos el buscador para evitar que queden textos de filtros anteriores

            const buscadorInput = document.getElementById('main-search');

            if (buscadorInput) buscadorInput.value = "";



            mostrarNotificacion("ORO INICIAL ELIMINADO. SE REQUIERE UNO NUEVO.", "⚠️");

        }



        // 3. Lógica normal de quitar/restar

        mazoActual[indice].cant--;

        if (mazoActual[indice].cant <= 0) {

            mazoActual.splice(indice, 1);

        }



        // 4. Si volvimos a faseOroInicial, forzamos el filtrado para ocultar la sidebar

        // y mostrar solo los oros legales en el tablero central

        if (faseOroInicial) {

            filtrarCartas();

        }



        renderizarMazo();

    }

}



function setearValoresInterfaz() {

    const b = document.getElementById('select-bloque');

    const f = document.getElementById('select-formato');

    const r = document.getElementById('select-raza');

    if (b) b.value = configMazo.bloque || "";

    if (f) f.value = configMazo.formato || "";

    if (r) r.value = configMazo.raza || "";

}



function liberarVistaMazoExistente() {

    const sidebar = document.querySelector('.sidebar');

    const overlay = document.getElementById('lock-overlay');



    // 1. Desbloqueamos visualmente el taller

    if (sidebar) {

        sidebar.style.display = "block";

        sidebar.classList.remove('sidebar-hidden');

        sidebar.style.visibility = "visible";

        sidebar.style.opacity = "1";

        sidebar.style.width = "320px"; // Aseguramos que recupere su ancho

    }

    if (overlay) overlay.classList.add('unlocked');



    // 2. Aplicamos las reglas visuales de los selectores

    bloquearSelectores(true);



    // 3. LA CLAVE: Verificamos si realmente hay un oro inicial en lo que cargamos

    const tieneOroIni = mazoActual.some(item => {

        const c = cartasMyL.find(x => x.ID === item.id);

        const textoHab = (c?.Habilidad || "").trim();

        // Misma lógica de detección: Tipo oro y habilidad corta

        return c && c.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;

    });



    // 4. Sincronizamos la variable lógica

    if (tieneOroIni) {

        faseOroInicial = false;

    } else {

        faseOroInicial = true;

    }



    // 5. Refrescamos la búsqueda para que muestre Aliados/Talismanes y NO los oros iniciales

    filtrarCartas();

}



// ==========================================

// SISTEMA DE NOTIFICACIONES ANTI-SPAM

// ==========================================

function mostrarNotificacion(mensaje, icono = "⚠️") {

    // 1. BUSCAR DUPLICADOS: Si ya hay un mensaje idéntico en pantalla, no hacer nada

    const notificacionesActivas = document.querySelectorAll('.notificacion-toast');

    for (let n of notificacionesActivas) {

        if (n.innerText.includes(mensaje)) {

            return; // Detiene la función aquí para que no se cree otra

        }

    }



    // 2. Crear contenedor si no existe

    let container = document.getElementById('notif-container');

    if (!container) {

        container = document.createElement('div');

        container.id = 'notif-container';

        container.style.cssText = "position: fixed; bottom: 20px; left: 20px; z-index: 9999; display: flex; flex-direction: column-reverse; gap: 10px;";

        document.body.appendChild(container);

    }



    // 3. Crear el elemento visual (Toast)

    const toast = document.createElement('div');

    toast.className = 'notificacion-toast';

    toast.innerHTML = `<span>${icono}</span> ${mensaje}`;



    // Estilo inyectado (puedes ajustarlo a tu gusto)

    toast.style.cssText = `

        background: rgba(0, 0, 0, 0.95);

        color: #fff;

        padding: 12px 20px;

        border-radius: 4px;

        border-left: 4px solid #d4af37;

        font-family: 'Cinzel', serif;

        font-size: 0.8rem;

        box-shadow: 0 4px 15px rgba(0,0,0,0.5);

        border: 1px solid rgba(212, 175, 55, 0.3);

        transition: all 0.3s ease;

        animation: slideInNotif 0.3s ease forwards;

    `;



    container.appendChild(toast);



    // 4. Auto-destrucción después de 3 segundos

    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform = "translateX(-20px)";

        setTimeout(() => toast.remove(), 300);

    }, 3000);

}



// ==========================================

// FUNCIÓN DE GUARDADO EN FIREBASE

// ==========================================

async function guardarMazoFirebase() {

    // 1. Validar que el usuario esté logueado

    if (!usuarioActual) {

        mostrarNotificacion("DEBES INICIAR SESIÓN PARA GUARDAR", "🚫");

        return;

    }



    // 2. Validar que el mazo no esté vacío

    if (mazoActual.length === 0) {

        mostrarNotificacion("EL MAZO ESTÁ VACÍO", "⚠️");

        return;

    }



    // 3. Opcional: Validar que exista el Oro Inicial (basado en tu lógica de detección)

    const tieneOroIni = mazoActual.some(item => {

        const c = cartasMyL.find(x => x.ID === item.id);

        const textoHab = (c?.Habilidad || "").trim();

        return c && c.Tipo.toLowerCase().includes('oro') && textoHab.length < 30;

    });



    if (!tieneOroIni) {

        mostrarNotificacion("FALTA ELEGIR EL ORO INICIAL", "⚠️");

        return;

    }



    try {

        // Mostramos un aviso de "procesando" cambiando el texto del botón (opcional)

        const btn = document.querySelector('.btn-save-deck');

        const originalText = btn ? btn.innerText : "GUARDAR CAMBIOS";

        if (btn) btn.innerText = "GUARDANDO EN EL REINO...";



        // 4. Guardar en la colección del usuario -> slots -> id del mazo

        await db.collection('usuarios').doc(usuarioActual.uid)

            .collection('slots').doc(slotId).set({

                cartas: mazoActual,

                config: configMazo,

                ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp()

            }, { merge: true });



        // Restaurar botón y avisar éxito

        if (btn) btn.innerText = originalText;

        mostrarNotificacion("ESTRATEGIA GUARDADA EN EL GRIMORIO", "⭐");



    } catch (error) {

        console.error("Error al guardar mazo:", error);

        mostrarNotificacion("ERROR AL CONECTAR CON EL REINO", "❌");

    }

}
