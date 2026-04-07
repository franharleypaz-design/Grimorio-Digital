let cartasMyL = []; 

const display = document.getElementById('card-display');
const count = document.getElementById('card-count');
const buscador = document.getElementById('main-search');
const panel = document.getElementById('card-detail-panel');

async function cargarGrimorio() {
    try {
        const respuesta = await fetch('cartas.json');
        if (!respuesta.ok) throw new Error("No se encontró el archivo cartas.json");
        cartasMyL = await respuesta.json();
        filtrarCartas();
    } catch (error) {
        console.error("Error:", error);
        display.innerHTML = `<div class="card-placeholder">Error al cargar el grimorio. Asegúrate de usar Live Server y que el archivo cartas.json no tenga errores.</div>`;
    }
}

function filtrarCartas() {
    const texto = buscador.value.toLowerCase();
    const raza = document.getElementById('raza-filter').value.toLowerCase();
    
    const ediciones = Array.from(document.querySelectorAll('.filter-group input[value="espada-sagrada"], .filter-group input[value="helenica"], .filter-group input[value="ragnarok"]'))
        .filter(i => i.checked).map(i => i.value);

    const tipos = Array.from(document.querySelectorAll('.filter-group input[value="aliado"], .filter-group input[value="talisman"], .filter-group input[value="totem"], .filter-group input[value="oro"]'))
        .filter(i => i.checked).map(i => i.value);

    const resultado = cartasMyL.filter(c => {
        const matchTexto = c.Nombre.toLowerCase().includes(texto) || c.Habilidad.toLowerCase().includes(texto);
        const matchRaza = raza === "" || (c.Raza && c.Raza.toLowerCase() === raza);
        const matchEdicion = ediciones.length === 0 || ediciones.includes(c.Carpeta_Edicion.toLowerCase().replace('_', '-'));
        const matchTipo = tipos.length === 0 || tipos.includes(c.Tipo.toLowerCase());

        return matchTexto && matchRaza && matchEdicion && matchTipo;
    });

    dibujarCartas(resultado);
}

function dibujarCartas(lista) {
    display.innerHTML = '';
    count.innerText = lista.length;

    if (lista.length === 0) {
        display.innerHTML = `<div class="card-placeholder">No se hallaron registros...</div>`;
        return;
    }

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
    document.getElementById('detail-text').innerHTML = `<p>${c.Habilidad}</p><p><small>Ilustrador: ${c.Ilustrador}</small></p>`;
    panel.classList.add('active');
}

buscador.addEventListener('input', filtrarCartas);
document.getElementById('raza-filter').addEventListener('change', filtrarCartas);
document.querySelectorAll('input[type="checkbox"]').forEach(i => i.addEventListener('change', filtrarCartas));
document.getElementById('close-detail').onclick = () => panel.classList.remove('active');

cargarGrimorio();