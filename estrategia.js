/**
 * COMPONENTE DE ANÁLISIS DE ESTRATEGIA - Mitos y Leyendas
 * Gestiona exclusivamente el panel derecho de estadísticas y análisis táctico.
 */

function renderizarMazo() {
    // 1. REFORZAR ACCESO A VARIABLES GLOBALES
    const mazo = window.mazoActual || (typeof mazoActual !== 'undefined' ? mazoActual : []);
    const catalogo = window.cartasMyL || (typeof cartasMyL !== 'undefined' ? cartasMyL : []);

    if (catalogo.length === 0) {
        console.warn("Análisis de Estrategia: Esperando catálogo de cartas...");
        return;
    }

    // 2. ESTRUCTURA DE DATOS INICIAL
    let stats = {
        totalCastillo: 0,
        tieneOroIni: false,
        nombreOroIni: "FALTA",
        aliados: 0,
        orosMazo: 0,
        otros: 0, 
        sumaFuerza: 0,
        cuentaFuerza: 0,
        motorRobo: 0,
        motorAnula: 0,
        costes: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
        razasMap: {},
        mejorCarta: { nombre: "Ninguna", impacto: 0, sinergia: 0 }
    };

    // 3. CÁLCULOS LÓGICOS
    mazo.forEach((item) => {
        const info = catalogo.find(c => c.ID === item.id);
        if (!info) return;

        const habilidad = (info.Habilidad || "").toLowerCase();
        const tipo = (info.Tipo || "").toLowerCase();
        const coste = parseInt(info.Coste) || 0;
        const fuerza = parseInt(info.Fuerza) || 0;

        for (let i = 0; i < item.cant; i++) {
            // Oro Inicial: Menos de 30 carácteres (Sin habilidad compleja)
            if (tipo.includes('oro') && !stats.tieneOroIni && habilidad.length < 30) {
                stats.tieneOroIni = true;
                stats.nombreOroIni = info.Nombre;
            } else {
                stats.totalCastillo++;

                if (tipo.includes('aliado')) {
                    stats.aliados++;
                    stats.sumaFuerza += fuerza;
                    stats.cuentaFuerza++;
                    if (info.Raza) {
                        const r = info.Raza.trim();
                        stats.razasMap[r] = (stats.razasMap[r] || 0) + 1;
                    }
                } else if (tipo.includes('oro')) {
                    stats.orosMazo++;
                } else {
                    stats.otros++;
                }

                // Motores de juego
                if (habilidad.includes("roba") || habilidad.includes("busca") || habilidad.includes("mira")) {
                    stats.motorRobo++;
                }
                if (habilidad.includes("anula") || habilidad.includes("destruye") || habilidad.includes("destierra") || habilidad.includes("cancela")) {
                    stats.motorAnula++;
                }
                
                // Curva de oro (excepto oros)
                if (!tipo.includes('oro')) {
                    stats.costes[coste > 4 ? 4 : coste]++;
                }

                // Lógica de "Carta Clave" (Basada en frecuencia y coste/fuerza)
                let impactoPotencial = (fuerza * 2) + (habilidad.length / 10);
                if (impactoPotencial > stats.mejorCarta.impacto && !tipo.includes('oro')) {
                    stats.mejorCarta = { 
                        nombre: info.Nombre, 
                        impacto: impactoPotencial.toFixed(0),
                        sinergia: item.cant * 10
                    };
                }
            }
        }
    });

    // 4. ACTUALIZACIÓN DE INTERFAZ FÍSICA
    const totalFinal = stats.totalCastillo + (stats.tieneOroIni ? 1 : 0);
    const promFuerza = stats.cuentaFuerza > 0 ? (stats.sumaFuerza / stats.cuentaFuerza) : 0;
    
    // Resumen Técnico
    setDOMText('stat-oro-ini', stats.tieneOroIni ? "SÍ" : "NO", stats.tieneOroIni ? "#f7ef8a" : "#ff6666");
    setDOMText('total-aliados', stats.aliados);
    setDOMText('total-oros', stats.orosMazo);
    setDOMText('total-otros', stats.otros);
    setDOMText('total-cards', `${totalFinal} / 50 CARTAS`, totalFinal > 50 ? "#ff6666" : "#d4af37");

    // Análisis Táctico
    setDOMText('fuerza-val', promFuerza.toFixed(1));
    setDOMText('fuerza-class', promFuerza > 3.5 ? "ALTA" : (promFuerza > 2 ? "MEDIA" : "BAJA"));
    
    setDOMText('robo-val', stats.motorRobo);
    setIndicator('robo-status', stats.motorRobo > 8 ? 'good' : (stats.motorRobo > 4 ? 'warn' : 'danger'));
    
    setDOMText('control-val', stats.motorAnula);
    setIndicator('control-status', stats.motorAnula > 6 ? 'good' : (stats.motorAnula > 3 ? 'warn' : 'danger'));

    // Raza Dominante y Sinergia
    let maxRaza = "NINGUNA", maxVal = 0;
    for (let r in stats.razasMap) {
        if(stats.razasMap[r] > maxVal) { maxVal = stats.razasMap[r]; maxRaza = r; }
    }
    const percSinergia = stats.aliados > 0 ? Math.round((maxVal / stats.aliados) * 100) : 0;
    setDOMText('raza-nombre', maxRaza.toUpperCase());
    setDOMText('sinergia-porcentaje', `${percSinergia}%`);
    setDOMText('fuera-sinergia', maxVal < stats.aliados ? `${stats.aliados - maxVal} hibridos` : "Puro", percSinergia < 60 ? "#ff6666" : "#aaa");

    // Curva de Oro
    let sumaCostes = 0;
    for (let i = 0; i <= 4; i++) {
        sumaCostes += (stats.costes[i] * i);
        const barra = document.getElementById(`bar-${i}`);
        if (barra) {
            const percBarra = stats.totalCastillo > 0 ? (stats.costes[i] / stats.totalCastillo) * 100 : 0;
            barra.style.height = `${Math.min(percBarra * 2.5, 100)}%`;
        }
    }
    const avgCurva = stats.totalCastillo > stats.orosMazo ? (sumaCostes / (stats.totalCastillo - stats.orosMazo)) : 0;
    setDOMText('curva-promedio', avgCurva.toFixed(2));
    setDOMText('riesgo-curva', avgCurva > 2.5 ? "⚠️ CURVA PESADA" : "✅ CURVA FLUIDA", avgCurva > 2.5 ? "#f1c40f" : "#2ecc71");

    // Carta Clave
    setDOMText('key-card-name', stats.mejorCarta.nombre.toUpperCase());
    setDOMText('key-card-sinergia', `${stats.mejorCarta.sinergia}%`);
    setDOMText('key-card-impacto', stats.mejorCarta.impacto);

    // Arquetipo y Recomendaciones
    determinarEstrategiaAvanzada(stats, totalFinal, maxRaza, maxVal, avgCurva);

    // Banner de Oro Inicial
    const oroStatus = document.getElementById('status-oro-inicial');
    if (oroStatus) {
        oroStatus.innerHTML = stats.tieneOroIni ? `🛡️ ORO INICIAL: ${stats.nombreOroIni}` : "❌ FALTA ORO SIN HABILIDAD";
        oroStatus.className = stats.tieneOroIni ? "status-oro-alert active-oro" : "status-oro-alert error-oro";
    }
}

function determinarEstrategiaAvanzada(s, total, maxRaza, maxVal, avg) {
    let arq = "ESTRATEGIA EQUILIBRADA";
    let dominio = "Versatilidad en mesa";
    let recs = [];

    if (total < 10) {
        arq = "ANALIZANDO..."; dominio = "Añade más cartas para diagnosticar";
    } else {
        if (s.aliados > 24) { arq = "AGRESIVO (SWARM)"; dominio = "Presión temprana por cantidad"; }
        else if (s.motorAnula > 10) { arq = "CONTROL MÍSTICO"; dominio = "Dominio por anulación y descarte"; }
        else if (s.motorRobo > 12) { arq = "COMBO / MOTOR"; dominio = "Aceleración de búsqueda"; }
        else if (maxVal > (s.aliados * 0.7)) { arq = `RACIAL: ${maxRaza.toUpperCase()}`; dominio = `Potencia basada en ${maxRaza}`; }

        // Recomendaciones Inteligentes
        if (!s.tieneOroIni) recs.push("⚠️ Urgente: Incluye un Oro sin habilidad.");
        if (total > 0 && s.orosMazo < 14) recs.push("💡 Sugerencia: Sube a 14-16 Oros en mazo.");
        if (avg > 2.8) recs.push("📉 Curva alta: Considera más aliados coste 1.");
        if (s.motorRobo < 5) recs.push("🎴 Poco robo: Tu mano podría vaciarse rápido.");
        if (total < 50) recs.push(`🃏 Faltan ${50 - total} cartas para el Castillo.`);
    }

    setDOMText('estrategia-tipo', arq);
    setDOMText('estrategia-dominio', dominio);

    const listContainer = document.getElementById('list-recommendations');
    if (listContainer) {
        listContainer.innerHTML = recs.length > 0 ? recs.map(r => `<li>${r}</li>`).join('') : "<li>✅ Tu mazo parece sólido.</li>";
    }
}

function setDOMText(id, text, color = null) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text;
        if (color) el.style.color = color;
    }
}

function setIndicator(id, status) {
    const el = document.getElementById(id);
    if (el) {
        el.className = `dot-indicator dot-${status}`;
    }
}