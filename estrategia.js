/**
 * COMPONENTE DE ANÁLISIS DE ESTRATEGIA - Mitos y Leyendas
 * Gestiona exclusivamente el panel derecho de estadísticas.
 */

function renderizarMazo() {
    // 1. REFORZAR ACCESO A VARIABLES GLOBALES
    // Buscamos las variables tanto en el scope global como en el objeto window
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
        razasMap: {}
    };

    // 3. CÁLCULOS LÓGICOS
    mazo.forEach((item) => {
        const info = catalogo.find(c => c.ID === item.id);
        if (!info) return;

        const habilidad = (info.Habilidad || "").toLowerCase();
        const tipo = (info.Tipo || "").toLowerCase();

        for (let i = 0; i < item.cant; i++) {
            // Oro Inicial: Básico, menos de 30 carácteres
            if (tipo.includes('oro') && !stats.tieneOroIni && habilidad.length < 30) {
                stats.tieneOroIni = true;
                stats.nombreOroIni = info.Nombre;
            } else {
                stats.totalCastillo++;

                if (tipo.includes('aliado')) {
                    stats.aliados++;
                    stats.sumaFuerza += (parseInt(info.Fuerza) || 0);
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

                if (habilidad.includes("roba") || habilidad.includes("busca") || habilidad.includes("mira")) {
                    stats.motorRobo++;
                }
                if (habilidad.includes("anula") || habilidad.includes("destruye") || habilidad.includes("destierra")) {
                    stats.motorAnula++;
                }
                
                if (!tipo.includes('oro')) {
                    let c = parseInt(info.Coste) || 0;
                    stats.costes[c > 4 ? 4 : c]++;
                }
            }
        }
    });

    // 4. ACTUALIZACIÓN FÍSICA DE LA INTERFAZ
    const totalFinal = stats.totalCastillo + (stats.tieneOroIni ? 1 : 0);
    
    setDOMText('stat-oro-ini', stats.tieneOroIni ? "SÍ" : "NO", stats.tieneOroIni ? "#f7ef8a" : "#ff6666");
    setDOMText('total-aliados', stats.aliados);
    setDOMText('total-oros', stats.orosMazo);
    setDOMText('total-otros', stats.otros);
    setDOMText('total-cards', `TOTAL: ${totalFinal} / 50 CARTAS`);

    setDOMText('fuerza-promedio', stats.cuentaFuerza > 0 ? (stats.sumaFuerza / stats.cuentaFuerza).toFixed(1) : "0");
    setDOMText('stat-robo', stats.motorRobo);
    setDOMText('stat-anula', stats.motorAnula);

    // Raza Dominante
    let maxRaza = "NINGUNA", maxVal = 0;
    for (let r in stats.razasMap) {
        if(stats.razasMap[r] > maxVal) { maxVal = stats.razasMap[r]; maxRaza = r; }
    }
    setDOMText('raza-predominante', maxRaza.toUpperCase());

    // Barras de Curva
    for (let i = 0; i <= 4; i++) {
        const barra = document.getElementById(`bar-${i}`);
        if (barra) {
            const porcentaje = stats.totalCastillo > 0 ? (stats.costes[i] / stats.totalCastillo) * 100 : 0;
            barra.style.height = `${Math.min(porcentaje * 2, 100)}%`; // Multiplicador x2 para mejor visualización
        }
    }

    // Arquetipo
    determinarTipoEstrategia(stats, totalFinal, maxRaza, maxVal);

    // Banner Oro Inicial
    const oroStatus = document.getElementById('status-oro-inicial');
    if (oroStatus) {
        if (stats.tieneOroIni) {
            oroStatus.innerHTML = `🛡️ ORO INICIAL: ${stats.nombreOroIni}`;
            oroStatus.style.background = "rgba(212, 175, 55, 0.1)";
            oroStatus.style.color = "#f7ef8a";
        } else {
            oroStatus.innerText = "❌ FALTA ORO SIN HABILIDAD";
            oroStatus.style.background = "rgba(255, 0, 0, 0.05)";
            oroStatus.style.color = "#ff6666";
        }
    }
}

function determinarTipoEstrategia(s, total, maxRaza, maxVal) {
    let arq = "ESTRATEGIA EQUILIBRADA";
    let color = "#f7ef8a";

    if (total < 5) {
        arq = "ANALIZANDO...";
        color = "#888";
    } else {
        if (s.aliados > 22) { arq = "AGRESIVO (SWARM)"; color = "#ff4d4d"; }
        else if (s.motorAnula > 8) { arq = "CONTROL MÍSTICO"; color = "#add8e6"; }
        else if (s.motorRobo > 10) { arq = "COMBO / MOTOR DE ROBO"; color = "#da70d6"; }
        else if (s.otros > s.aliados && s.aliados > 0) { arq = "SOPORTE / TALISMANES"; color = "#90ee90"; }
        else if (s.aliados >= 10 && maxVal > (s.aliados * 0.6)) { arq = `RACIAL: ${maxRaza.toUpperCase()}`; color = "#d4af37"; }
    }

    const el = document.getElementById('arquetipo-sugerido');
    if (el) {
        el.innerText = arq;
        el.style.color = color;
    }
}

function setDOMText(id, text, color = null) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text;
        if (color) el.style.color = color;
    }
}