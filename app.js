// SUPABASE_URL, SUPABASE_KEY, supabaseClient y TABLA ahora viven en config.js

// Las 46 Tareas predefinidas
const TAREAS_DEFAULT = [
  "Actualización de planos realizados", "Análisis especificaciones cliente",
  "Anidado de ficheros 1000's", "Anidado de ficheros 2000's", "Anidado de ficheros 3000's", "Anidado de ficheros 4000's", "Anidado de ficheros 6000's",
  "AOYV", "Arranque sesión remota", "Ausencia no recuperable", "Ausencia recuperable", "Comida",
  "Consulta técnica", "Descanso 20'", "Descanso 30'", "Espera de nueva tarea", "Fuera escritorio", "Generación .e2", "Generación .e3",
  "Generación de lotes de planchas", "Generación de previas", "Generación de secuencias de corte",
  "Maquillaje .e2 1000's", "Maquillaje .e2 2000's", "Maquillaje .e2 3000's", "Maquillaje .e2 4000's",
  "Maquillaje .e2 6000's", "Maquillaje de previas", "Maquillaje de UA", "Maquillaje de UL", "Modificación planos GR",
  "Modificaciones en planos", "Nueva tarea", "Píldora de ciberseguridad", "Plano previas", "Problemas red en servidores cliente",
  "Productos intermedios", "Programación", "Reunión por Teams", "Reinstalación software", "Revisión de comentarios", "Revisión de paneles",
  "Revisión de unidades abiertas UA", "Revisión de unidades lineales UL", "Revisión grupos", "Revisión maquillaje 1000's",
  "Revisión maquillaje 2000's", "Revisión maquillaje 3000's", "Revisión maquillaje 4000's",
  "Revisión maquillaje 6000's", "Revisión previas", "Solicitada nueva tarea", "Varios"
];

// Los 13 Proyectos predefinidos
const PROYECTOS_DEFAULT = [
  "ABAC", "BAC2", "BLOR", "COM", "DES", "FES", "FOR", "INFO", "INT", "MAN", "NAV", "PROG", "VAC"
];

/**
 * Fusiona en una lista ya guardada en localStorage (tareas o proyectos) los
 * valores nuevos que se vayan incorporando en cada actualización de la app.
 * Si el navegador todavía no tiene esa lista guardada (instalación nueva),
 * no hace nada aquí: se usará directamente el array *_DEFAULT correspondiente,
 * que ya incluye los valores nuevos. Cada bloque de migración se aplica una
 * única vez (su propia clave en localStorage marca si ya se aplicó), así que
 * si luego borras alguno con el botón 🗑️ no vuelve a aparecer solo, y añadir
 * un bloque nuevo en el futuro no repite los anteriores.
 */
function aplicarMigracionesLista(claveLista, migraciones) {
  let lista = JSON.parse(localStorage.getItem(claveLista));
  if (!lista) return null;

  let huboCambios = false;
  migraciones.forEach(migracion => {
    if (!localStorage.getItem(migracion.clave)) {
      migracion.valores.forEach(v => {
        if (!lista.includes(v)) {
          lista.push(v);
          huboCambios = true;
        }
      });
      localStorage.setItem(migracion.clave, '1');
    }
  });
  if (huboCambios) {
    localStorage.setItem(claveLista, JSON.stringify(lista));
  }
  return lista;
}

const MIGRACIONES_TAREAS = [
  { clave: 'cfg_migracion_tareas_2026_09', valores: ["Fuera escritorio", "Varios", "Nueva tarea", "Revisión grupos", "Revisión previas", "Maquillaje de previas"] },
  { clave: 'cfg_migracion_tareas_2026_09_v2', valores: ["Ausencia no recuperable", "Ausencia recuperable"] },
  { clave: 'cfg_migracion_tareas_2026_09_v3', valores: ["Arranque sesión remota"] },
  { clave: 'cfg_migracion_tareas_2026_09_v4', valores: ["Píldora de ciberseguridad", "Consulta técnica"] },
  { clave: 'cfg_migracion_tareas_2026_09_v5', valores: ["Anidado de ficheros 1000's", "Anidado de ficheros 2000's", "Anidado de ficheros 4000's", "Anidado de ficheros 6000's", "Actualización de planos realizados"] }
];

const MIGRACIONES_PROYECTOS = [
  { clave: 'cfg_migracion_proyectos_2026_09', valores: ["FES"] }
];

// Cargar desde LocalStorage si existen (con las migraciones ya fusionadas) o usar los por defecto
let configData = {
  tareas: aplicarMigracionesLista('cfg_tareas', MIGRACIONES_TAREAS) || TAREAS_DEFAULT,
  proyectos: aplicarMigracionesLista('cfg_proyectos', MIGRACIONES_PROYECTOS) || PROYECTOS_DEFAULT
};

let tipoConfigActual = '';
let idiomaActual = 'es';
let tareasCargadasCache = [];

// null en la vista normal de un solo día; {desde, hasta, tipo} cuando el
// listado está mostrando un rango de fechas (filtros rápidos Semana/Mes).
let rangoActivo = null;

// DIAS_SEMANA, MESES, formatearFechaISO, obtenerFechaHoyISO,
// obtenerJornadaTeoricaMinutos y obtenerDescansoMinutos viven ahora en
// config.js (compartidos con informes.js y Semana.js, para que no se
// desincronicen entre páginas).

/**
 * Número de semana ISO-8601 (lunes como primer día, la semana 1 es la que
 * contiene el primer jueves del año) del día indicado.
 */
function obtenerNumeroSemanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaSemanaISO = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaSemanaISO);
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - inicioAnio) / 86400000) + 1) / 7);
}

const TEXTOS_SEMANA_NUM = { es: 'Semana', gl: 'Semana', en: 'Week' };

/**
 * Muestra en la cabecera la semana del año en curso, el día y la fecha de
 * hoy (sin el nombre "REGHOR"), con la primera letra del día en mayúscula,
 * y deja preparado el hueco del reloj en vivo (ver iniciarRelojEnVivo).
 */
function actualizarTituloConDia() {
  const hoy = new Date();
  const nombreDia = DIAS_SEMANA[idiomaActual][hoy.getDay()];
  const nombreDiaCap = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
  const nombreMes = MESES[idiomaActual][hoy.getMonth()];
  const dia = hoy.getDate();
  const anio = hoy.getFullYear();
  const numSemana = obtenerNumeroSemanaISO(hoy);
  const textoSemana = TEXTOS_SEMANA_NUM[idiomaActual] || TEXTOS_SEMANA_NUM.es;

  const fechaTexto = (idiomaActual === 'en')
    ? `${nombreDiaCap}, ${nombreMes} ${dia}, ${anio}`
    : `${nombreDiaCap} ${dia} de ${nombreMes} de ${anio}`;

  const elSemana = document.getElementById('txt-semana');
  const elFecha = document.getElementById('txt-fecha-dia');
  if (elSemana) elSemana.textContent = `${textoSemana} ${numSemana} ·`;
  if (elFecha) elFecha.textContent = fechaTexto;
}

/**
 * Color del reloj en vivo de la cabecera según la hora: rojo hasta las
 * 10:00 (cubre también la entrada, aprox. 06:30), naranja de 10:00 a 14:00,
 * verde de 14:00 a 17:00 y rojo de nuevo a partir de las 17:00.
 */
function colorRelojSegunHora(fecha) {
  const minutosDelDia = fecha.getHours() * 60 + fecha.getMinutes();
  if (minutosDelDia >= 17 * 60) return '#dc3545';
  if (minutosDelDia >= 14 * 60) return '#28a745';
  if (minutosDelDia >= 10 * 60) return '#fd7e14';
  return '#dc3545';
}

/**
 * Segundos transcurridos EN BRUTO (sin descontar pausas) desde que empezó
 * la jornada de hoy -hora de inicio del primer registro- hasta "ahora".
 * Devuelve null si hoy todavía no hay ningún registro (la jornada no ha
 * empezado). A diferencia de calcularTiempoEfectivoSegundos, aquí no se
 * descuentan las pausas: es el tiempo total transcurrido desde que se
 * empezó a trabajar, use en lo que se use ese tiempo.
 */
function calcularSegundosDesdeInicioJornada(ahora) {
  const registros = registrosHoyContadorCache;
  if (!registros || registros.length === 0) return null;

  const [h, m] = registros[0].horainicio.split(':').map(Number);
  const inicioJornadaMin = h * 60 + m;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes() + ahora.getSeconds() / 60;
  const minutos = Math.max(0, minutosAhora - inicioJornadaMin);
  return Math.floor(minutos * 60);
}

/**
 * Contador (hh:mm:ss, siempre en verde) del tiempo transcurrido desde que
 * empezó la jornada de hoy. Se para y queda a "+00:00:00" en cuanto se
 * pulsa "Finalizar jornada"; al Reabrir jornada vuelve a contar en vivo
 * desde el inicio real de la jornada (no desde cero). Antes de que haya
 * ningún registro hoy, queda vacío y oculto.
 */
function actualizarContadorExtra(ahora) {
  const el = document.getElementById('contador-extra');
  if (!el) return;

  const hoyStr = obtenerFechaHoyISO();
  if (esDiaCerrado(hoyStr)) {
    el.textContent = '+00:00:00';
    el.style.color = '#28a745';
    el.style.display = '';
    return;
  }

  const segundos = calcularSegundosDesdeInicioJornada(ahora);
  if (segundos === null) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }

  el.textContent = `+${formatearSegundosComoHHMMSS(segundos)}`;
  el.style.color = '#28a745';
  el.style.display = '';
}

/** Actualiza el texto (h:mm:ss) y el color del reloj en vivo de la cabecera, y el contador de tiempo extra desde las 16:00. */
function actualizarRelojEnVivo() {
  const el = document.getElementById('reloj-actual');
  if (!el) return;
  const ahora = new Date();
  const horas = ahora.getHours();
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  const segundos = String(ahora.getSeconds()).padStart(2, '0');
  el.textContent = `${horas}:${minutos}:${segundos}`;
  el.style.color = colorRelojSegunHora(ahora);

  // Cada bloque envuelto por separado: un fallo en uno (p.ej. el contador
  // de rendimiento) nunca debe impedir que el resto de la cabecera se seguir
  // actualizando cada segundo.
  try { actualizarContadorEfectivoYRendimiento(ahora); } catch (e) { console.error('Error en el contador de tiempo efectivo/% rendimiento:', e); }
  try { actualizarContadorExtra(ahora); } catch (e) { console.error('Error en el contador de tiempo extra:', e); }
}

/** Pone en marcha el reloj en vivo de la cabecera (arranque inmediato + cada segundo). */
function iniciarRelojEnVivo() {
  actualizarRelojEnVivo();
  setInterval(actualizarRelojEnVivo, 1000);
}

// ------------------------------------------------------------
// Contador de tiempo efectivo de la jornada + % de rendimiento (cabecera).
// Ambos se recalculan cada segundo (iniciarRelojEnVivo) a partir de una
// caché de los registros de HOY (independiente de lo que se esté viendo en
// el listado, que puede estar mostrando otro día u otro rango), que se
// refresca cada vez que se guarda o borra un registro.
// ------------------------------------------------------------

// Tareas que pausan el contador de tiempo efectivo (no cuentan como trabajo).
const TAREAS_PAUSA_CONTADOR = ["Fuera escritorio", "Comida", "Descanso 20'", "Descanso 30'", "Espera de nueva tarea"];

// PROYECTOS_RENDIMIENTO y calcularPorcentajeRendimiento() viven en config.js
// (compartidos con graficos.js).

let registrosHoyContadorCache = [];

/** Refresca la caché de registros de HOY usada por el contador de tiempo efectivo y el % de rendimiento. */
async function refrescarRegistrosHoyContador() {
  if (!supabaseClient) return;
  const hoyStr = obtenerFechaHoyISO();
  try {
    const { data, error } = await supabaseClient
      .from(TABLA)
      .select('tarea,proyecto,horainicio,horafin')
      .ilike('fecha', `%${hoyStr}%`);
    if (error || !data) return;
    registrosHoyContadorCache = data
      .filter(r => r.horainicio)
      .sort((a, b) => String(a.horainicio).localeCompare(String(b.horainicio)));
  } catch (e) {
    console.error('Error al refrescar los registros de hoy para el contador:', e);
  }
}

/** Minutos transcurridos entre 'HH:MM' y el instante "ahora" (mismo día). */
function minutosHastaAhora(horaStr, ahora) {
  if (!horaStr) return 0;
  const [h, m] = horaStr.split(':').map(Number);
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes() + ahora.getSeconds() / 60;
  return Math.max(0, minutosAhora - (h * 60 + m));
}

/**
 * Segundos de tiempo efectivo transcurridos desde que empezó la jornada de
 * hoy (hora de inicio del primer registro), descontando los intervalos en
 * tareas de pausa (TAREAS_PAUSA_CONTADOR) -incluido el tramo en curso, si la
 * última tarea registrada es una pausa y todavía no tiene hora de fin-.
 * Devuelve null si hoy todavía no hay ningún registro (la jornada no ha empezado).
 */
function calcularTiempoEfectivoSegundos(ahora) {
  const registros = registrosHoyContadorCache;
  if (!registros || registros.length === 0) return null;

  const inicioJornadaMin = (() => {
    const [h, m] = registros[0].horainicio.split(':').map(Number);
    return h * 60 + m;
  })();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes() + ahora.getSeconds() / 60;
  if (minutosAhora <= inicioJornadaMin) return 0;

  let minutosPausa = 0;
  registros.forEach((reg, idx) => {
    if (!TAREAS_PAUSA_CONTADOR.includes(reg.tarea)) return;
    if (reg.horafin) {
      minutosPausa += obtenerMinutosDuracion(reg.horainicio, reg.horafin);
    } else if (idx === registros.length - 1) {
      // Pausa en curso (todavía sin hora de fin): sigue acumulando en tiempo real.
      minutosPausa += minutosHastaAhora(reg.horainicio, ahora);
    }
  });

  const minutosEfectivos = Math.max(0, (minutosAhora - inicioJornadaMin) - minutosPausa);
  return Math.floor(minutosEfectivos * 60);
}

/** Minutos de hoy registrados en los proyectos de rendimiento (BLOR o BAC2), incluido el tramo en curso si la última tarea es de uno de esos proyectos y aún no tiene hora de fin. */
function calcularMinutosRendimientoHoy(ahora) {
  const registros = registrosHoyContadorCache;
  if (!registros || registros.length === 0) return 0;
  // PROYECTOS_RENDIMIENTO vive en config.js; si por error se ha sustituido
  // app.js sin sustituir también config.js a la vez, esto evita un
  // ReferenceError que rompería el reloj de la cabecera entero.
  if (typeof PROYECTOS_RENDIMIENTO === 'undefined') return 0;

  let minutos = 0;
  registros.forEach((reg, idx) => {
    if (!PROYECTOS_RENDIMIENTO.includes(reg.proyecto)) return;
    if (reg.horafin) {
      minutos += obtenerMinutosDuracion(reg.horainicio, reg.horafin);
    } else if (idx === registros.length - 1) {
      minutos += minutosHastaAhora(reg.horainicio, ahora);
    }
  });
  return minutos;
}

/**
 * Minutos registrados en los proyectos de rendimiento (BLOR o BAC2) dentro
 * de una lista de registros YA CERRADA de un día que no es hoy (por eso no
 * hay "tramo en curso" que sumar en vivo: ese día no está pasando ahora
 * mismo). Se usa para recalcular el Rto de la cabecera cuando se navega a
 * un día distinto del actual con el selector de fecha.
 */
function calcularMinutosRendimientoDeLista(lista) {
  if (!lista || lista.length === 0) return 0;
  if (typeof PROYECTOS_RENDIMIENTO === 'undefined') return 0;

  let minutos = 0;
  lista.forEach(reg => {
    if (!PROYECTOS_RENDIMIENTO.includes(reg.proyecto)) return;
    minutos += obtenerMinutosDuracion(reg.horainicio, reg.horafin);
  });
  return minutos;
}

/** Formatea segundos totales como 'hh:mm:ss' (con las horas a 2 cifras). */
function formatearSegundosComoHHMMSS(totalSegundos) {
  const segundos = Math.max(0, Math.floor(totalSegundos || 0));
  const hh = String(Math.floor(segundos / 3600)).padStart(2, '0');
  const mm = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Devuelve la fecha (YYYY-MM-DD) del día actualmente activo en el listado de
 * abajo -el que se ve en el selector de Fecha-, o null si en vez de un solo
 * día hay un rango de varios días activo (rangoActivo), caso en el que no
 * hay un único día para el que calcular el Rto de la cabecera.
 */
function obtenerFechaDiaActivo() {
  if (rangoActivo) return null;
  const inputFecha = document.getElementById('fecha');
  const valor = inputFecha ? inputFecha.value.trim() : '';
  return valor || obtenerFechaHoyISO();
}

/** Actualiza el contador de tiempo efectivo (hh:mm:ss, siempre de HOY) y el % de rendimiento de la cabecera. */
function actualizarContadorEfectivoYRendimiento(ahora) {
  const elContador = document.getElementById('contador-efectivo');
  const elPorcentaje = document.getElementById('pct-rendimiento');
  if (!elContador && !elPorcentaje) return;

  const segundosEfectivos = calcularTiempoEfectivoSegundos(ahora);
  if (elContador) {
    elContador.textContent = formatearSegundosComoHHMMSS(segundosEfectivos || 0);
  }

  if (elPorcentaje) {
    // Se muestra siempre con el prefijo "Rto=", aunque no haya valor calculable
    // (fin de semana/festivo, o config.js desfasado sin las funciones nuevas),
    // para que quede claro que el indicador existe y solo falta dato ("--%")
    // en vez de dejar el hueco en blanco, que parece "no implementado".
    if (typeof calcularPorcentajeRendimiento !== 'function') {
      elPorcentaje.textContent = 'Rto=--%';
    } else {
      const hoyStr = obtenerFechaHoyISO();
      const diaActivo = obtenerFechaDiaActivo();

      let minutosRendimiento;
      let fechaParaCalculo;
      if (diaActivo === null) {
        // Hay un rango de varios días activo (Esta semana, Este mes...): el
        // Rto de la cabecera es un indicador de UN día, no tiene un valor
        // único que mostrar para un periodo completo (para eso está el
        // gráfico de Rendimiento en graficos.html).
        elPorcentaje.textContent = 'Rto=--%';
        return;
      } else if (diaActivo === hoyStr) {
        // Viendo hoy: en vivo, incluyendo el tramo en curso si la última
        // tarea todavía no tiene hora de fin.
        minutosRendimiento = calcularMinutosRendimientoHoy(ahora);
        fechaParaCalculo = hoyStr;
      } else {
        // Viendo un día distinto de hoy: recalculado a partir de los
        // registros de ESE día, ya cargados en el listado de abajo (no está
        // "en curso", así que no hay tramo en vivo que sumar).
        minutosRendimiento = calcularMinutosRendimientoDeLista(tareasCargadasCache);
        fechaParaCalculo = diaActivo;
      }

      const pct = calcularPorcentajeRendimiento(minutosRendimiento, fechaParaCalculo);
      elPorcentaje.textContent = (pct === null) ? 'Rto=--%' : `Rto=${Math.round(pct)}%`;
    }
  }
}

// ------------------------------------------------------------
// Columnas redimensionables (arrastrar el borde derecho de la cabecera).
// Cada tirador fija en píxeles la variable CSS compartida de esa columna
// (sustituyendo su minmax() original), lo que también ensancha/encoge la
// misma columna en el formulario de arriba, ya que ambos comparten
// variable. El scroll horizontal ya existente actúa de red de seguridad
// si una columna crece más que el hueco disponible.
// ------------------------------------------------------------
const COLUMNAS_REDIMENSIONABLES = {
  fecha:      { variable: '--w-fecha',       min: 70, max: 220 },
  tarea:      { variable: '--fr-tarea',      min: 70, max: 420 },
  proyecto:   { variable: '--fr-proyecto',   min: 55, max: 320 },
  bloque:     { variable: '--fr-bloque',     min: 60, max: 320 },
  hora:       { variable: '--w-hora',        min: 60, max: 160 },
  comentario: { variable: '--fr-comentario', min: 80, max: 520 },
  notas:      { variable: '--fr-notas',      min: 60, max: 420 }
};
const CLAVE_ANCHOS_COLUMNAS = 'reghor_anchos_columnas';

/**
 * Restaura, si las hay, las anchuras de columna que el usuario dejó
 * guardadas en una sesión anterior.
 */
function aplicarAnchosColumnasGuardados() {
  let anchos;
  try {
    anchos = JSON.parse(localStorage.getItem(CLAVE_ANCHOS_COLUMNAS));
  } catch (e) {
    anchos = null;
  }
  if (!anchos) return;

  Object.keys(anchos).forEach(clave => {
    const col = COLUMNAS_REDIMENSIONABLES[clave];
    if (col && Number.isFinite(anchos[clave])) {
      document.documentElement.style.setProperty(col.variable, `${anchos[clave]}px`);
    }
  });
}

function guardarAnchoColumna(clave, anchoPx) {
  let anchos;
  try {
    anchos = JSON.parse(localStorage.getItem(CLAVE_ANCHOS_COLUMNAS)) || {};
  } catch (e) {
    anchos = {};
  }
  anchos[clave] = Math.round(anchoPx);
  localStorage.setItem(CLAVE_ANCHOS_COLUMNAS, JSON.stringify(anchos));
}

function inicializarRedimensionColumnas() {
  document.querySelectorAll('.col-resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (event) => {
      const clave = handle.dataset.col;
      const col = COLUMNAS_REDIMENSIONABLES[clave];
      if (!col) return;

      event.preventDefault();
      const celda = handle.parentElement;
      const anchoInicial = celda ? celda.getBoundingClientRect().width : 100;
      const xInicial = event.clientX;
      handle.classList.add('redimensionando');

      function alMover(e) {
        const delta = e.clientX - xInicial;
        const nuevoAncho = Math.max(col.min, Math.min(col.max, anchoInicial + delta));
        document.documentElement.style.setProperty(col.variable, `${nuevoAncho}px`);
      }
      function alSoltar() {
        document.removeEventListener('mousemove', alMover);
        document.removeEventListener('mouseup', alSoltar);
        handle.classList.remove('redimensionando');
        const valorActual = getComputedStyle(document.documentElement).getPropertyValue(col.variable).trim();
        const px = parseFloat(valorActual);
        if (Number.isFinite(px)) guardarAnchoColumna(clave, px);
      }
      document.addEventListener('mousemove', alMover);
      document.addEventListener('mouseup', alSoltar);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  aplicarAnchosColumnasGuardados();
  inicializarRedimensionColumnas();

  poblarSelects();
  poblarSelectorMeses();
  actualizarTituloConDia();

  const inputFecha = document.getElementById('fecha');
  if (inputFecha) {
    inputFecha.addEventListener('change', () => cargarTareas());
  }

  // Cargar el listado de tareas ya guardadas es lo prioritario: se hace
  // ANTES que cualquier función añadida más adelante (reloj en vivo,
  // contador de tiempo efectivo/% de rendimiento...), para que un fallo en
  // una de esas funciones más nuevas (por ejemplo, por tener mezclados
  // ficheros de versiones distintas) nunca pueda impedir que se vean las
  // tareas ya guardadas: NO se han borrado, solo no se cargarían en pantalla.
  if (supabaseClient) {
    await cargarTareas();
  } else {
    document.getElementById('tabla-body').innerHTML = '<div class="tabla-msg" style="color:red;">⚠️ Error al inicializar Supabase.</div>';
  }

  try {
    await refrescarRegistrosHoyContador();
    iniciarRelojEnVivo();
  } catch (e) {
    console.error('Error al iniciar el reloj/contador de la cabecera (no afecta al listado de tareas, ya cargado arriba):', e);
  }
});

function ordenarLista(array) {
  return array.sort((a, b) => a.localeCompare(b, idiomaActual, { sensitivity: 'base' }));
}

function poblarSelects() {
  const selTarea = document.getElementById('tarea');
  const selProyecto = document.getElementById('proyecto');

  configData.tareas = ordenarLista(configData.tareas);
  configData.proyectos = ordenarLista(configData.proyectos);

  if (selTarea) {
    selTarea.innerHTML = configData.tareas.map(t => `<option value="${t}">${t}</option>`).join('');
    sincronizarComentario();
  }

  if (selProyecto) {
    selProyecto.innerHTML = configData.proyectos.map(p => `<option value="${p}">${p}</option>`).join('');
    if (configData.proyectos.includes('BAC2')) {
      selProyecto.value = 'BAC2';
    }
  }
}

function sincronizarComentario() {
  const selTarea = document.getElementById('tarea');
  const inputComentario = document.getElementById('comentario');
  if (selTarea && inputComentario && selTarea.value) {
    inputComentario.value = selTarea.value;
  }
}

// Tareas que, al seleccionarlas, se autocompletan y se guardan solas.
const TAREAS_AUTOGUARDADO = ["Comida", "Descanso 30'"];

/**
 * Manejador del onchange del desplegable "Tarea". Además de sincronizar el
 * comentario (como siempre), si se selecciona "Comida" o "Descanso 30'" y
 * NO se está editando un registro ya existente, se autocompleta proyecto
 * "COM", bloque "GENERAL", hora de inicio la hora actual y hora de fin esa
 * misma hora + 30 minutos, y se guarda automáticamente sin necesidad de
 * pulsar "Guardar". Si se está editando un registro (tarea-id con valor),
 * solo se autocompletan los campos, para no sobrescribir sin querer una
 * tarea ya guardada con un simple cambio de desplegable.
 */
async function manejarCambioTarea() {
  sincronizarComentario();

  const tareaSeleccionada = document.getElementById('tarea').value;
  if (!TAREAS_AUTOGUARDADO.includes(tareaSeleccionada)) return;

  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const finMinutos = (ahora.getHours() * 60 + ahora.getMinutes() + 30) % 1440;
  const horaFinCalc = `${String(Math.floor(finMinutos / 60)).padStart(2, '0')}:${String(finMinutos % 60).padStart(2, '0')}`;

  document.getElementById('proyecto').value = 'COM';
  document.getElementById('bloque').value = 'GENERAL';
  document.getElementById('horainicio').value = horaActual;
  document.getElementById('horafin').value = horaFinCalc;

  const editando = document.getElementById('tarea-id').value;
  if (!editando) {
    await guardarRegistroFormulario();
  }
}

function abrirConfig(tipo) {
  tipoConfigActual = tipo;
  document.getElementById('modal-titulo').textContent = `Configurar ${tipo}`;
  renderListaConfig();
  document.getElementById('modal-config').style.display = 'flex';
}

function cerrarConfig() {
  document.getElementById('modal-config').style.display = 'none';
}

function renderListaConfig() {
  const ul = document.getElementById('lista-config');
  configData[tipoConfigActual] = ordenarLista(configData[tipoConfigActual]);

  ul.innerHTML = configData[tipoConfigActual].map((item, idx) => `
    <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
      <span>${item}</span>
      <button type="button" class="btn-mini" onclick="eliminarOpcionConfig(${idx})">🗑️</button>
    </li>
  `).join('');
}

function agregarOpcionConfig() {
  const input = document.getElementById('nuevo-valor-config');
  const val = input.value.trim();
  if (val && !configData[tipoConfigActual].includes(val)) {
    configData[tipoConfigActual].push(val);
    configData[tipoConfigActual] = ordenarLista(configData[tipoConfigActual]);
    localStorage.setItem(`cfg_${tipoConfigActual}`, JSON.stringify(configData[tipoConfigActual]));
    input.value = '';
    renderListaConfig();
    poblarSelects();
  }
}

function eliminarOpcionConfig(idx) {
  configData[tipoConfigActual].splice(idx, 1);
  localStorage.setItem(`cfg_${tipoConfigActual}`, JSON.stringify(configData[tipoConfigActual]));
  renderListaConfig();
  poblarSelects();
}

function setHoraActual(inputId) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById(inputId).value = `${hh}:${mm}`;
}

async function copiarHoraFinAnterior() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from(TABLA)
      .select('horafin')
      .order('id', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0 && data[0].horafin) {
      document.getElementById('horainicio').value = data[0].horafin;
    } else {
      alert('No se encontró ninguna hora fin registrada.');
    }
  } catch(e) {
    alert("Error de conexión al consultar Supabase.");
  }
}

async function cargarTareas() {
  rangoActivo = null;
  actualizarEtiquetaRangoActivo();
  actualizarEtiquetaTeoricaSegunModo();
  const btnFinalizarJornada = document.getElementById('btn-finalizar-jornada');
  if (btnFinalizarJornada) btnFinalizarJornada.disabled = false;

  const tablaBody = document.getElementById('tabla-body');
  tablaBody.innerHTML = '<div class="tabla-msg">Cargando datos desde Supabase...</div>';

  const inputFecha = document.getElementById('fecha');
  let fechaFiltroStr = inputFecha ? inputFecha.value.trim() : '';

  // Si al entrar en la app el campo Fecha está vacío, se pone SIEMPRE la
  // fecha de hoy (nunca la del último registro guardado, que podía ser de
  // un día anterior si hoy todavía no se ha apuntado nada).
  if (!fechaFiltroStr) {
    fechaFiltroStr = obtenerFechaHoyISO();
    if (inputFecha) {
      inputFecha.value = fechaFiltroStr;
    }
  }

  actualizarEstadoDiaCerrado();

  try {
    const { data: tareas, error } = await supabaseClient
      .from(TABLA)
      .select('*')
      .ilike('fecha', `%${fechaFiltroStr}%`);

    if (error) {
      console.error("Error al cargar registros:", error);
      tablaBody.innerHTML = `<div class="tabla-msg" style="color:red;">Error Supabase: ${error.message}</div>`;
      actualizarAvisoAbiertas([]);
      await actualizarResumenHoras([], fechaFiltroStr);
      return;
    }

    if (!tareas || tareas.length === 0) {
      tablaBody.innerHTML = `<div class="tabla-msg">No existen registros guardados para la fecha ${fechaFiltroStr}.</div>`;
      actualizarAvisoAbiertas([]);
      await actualizarResumenHoras([], fechaFiltroStr);
      return;
    }

    // De más tarde a más temprano según la hora de inicio -la última tarea
    // registrada aparece arriba del todo- (a igualdad de hora, la más
    // reciente, con id más alto, también va primero).
    tareas.sort((a, b) => {
      const horaA = a.horainicio || '';
      const horaB = b.horainicio || '';
      if (horaA !== horaB) return horaA > horaB ? -1 : 1;
      return (b.id || 0) - (a.id || 0);
    });
    tareasCargadasCache = tareas;
    actualizarAvisoAbiertas(tareas);

    // Al recargar la fecha se limpia el filtro instantáneo, para no ocultar
    // por sorpresa registros del nuevo día bajo un texto de filtro que ya
    // no tiene sentido.
    const inputFiltroListado = document.getElementById('filtro-listado');
    if (inputFiltroListado) inputFiltroListado.value = '';

    renderFilasTabla(tareas);

    await actualizarResumenHoras(tareas, fechaFiltroStr);

  } catch(err) {
    console.error("Error inesperado en cargarTareas:", err);
    tablaBody.innerHTML = `<div class="tabla-msg" style="color:red;">Error al procesar la solicitud.</div>`;
    actualizarAvisoAbiertas([]);
    await actualizarResumenHoras([], fechaFiltroStr);
  }
}

/**
 * Pinta las filas del listado a partir de una lista de registros ya
 * decidida por quien llama (el día completo, o el resultado de aplicar el
 * filtro instantáneo). El índice (idx + 1) es un número de fila puramente
 * visual, calculado en el navegador a partir de la posición en la lista
 * recibida: no se guarda en Supabase ni depende del id real del registro.
 */
function renderFilasTabla(lista) {
  const tablaBody = document.getElementById('tabla-body');
  if (!tablaBody) return;

  tablaBody.innerHTML = lista.map((item, idx) => {
    let rawF = String(item.fecha || '').trim();
    let fDisplay = rawF.includes('T') ? rawF.split('T')[0] : rawF.split(' ')[0];

    return `
      <div class="tabla-grid-row tabla-row" ondblclick="cargarParaEditar(${item.id})" oncontextmenu="mostrarMenuContextual(event, ${item.id})" title="Doble clic para editar · clic derecho para más opciones">
        <div class="celda-numero">${idx + 1}</div>
        <div>${fDisplay}</div>
        <div>${item.tarea || ''}</div>
        <div>${item.proyecto || ''}</div>
        <div>${item.bloque || ''}</div>
        <div>${item.horainicio || ''}</div>
        <div>${item.horafin || ''}</div>
        <div>${item.comentario || ''}</div>
        <div>${item.notas || ''}</div>
        <div><strong>${calcularDuracion(item.horainicio, item.horafin)}</strong></div>
      </div>
    `;
  }).join('');
}

const TEXTOS_FILTRO_SIN_RESULTADOS = {
  es: 'Ningún registro coincide con el filtro.',
  gl: 'Ningún rexistro coincide co filtro.',
  en: 'No records match the filter.'
};

/**
 * Filtro instantáneo sobre el listado ya cargado del día (no vuelve a
 * consultar Supabase): busca el texto escrito en tarea, proyecto, bloque,
 * comentario y notas, sin distinguir mayúsculas/minúsculas ni acentos vs
 * no acentos exactos (comparación simple en minúsculas). Con el campo
 * vacío se restaura el listado completo del día.
 */
function aplicarFiltroInstantaneo() {
  const input = document.getElementById('filtro-listado');
  const tablaBody = document.getElementById('tabla-body');
  if (!input || !tablaBody) return;

  const textoOriginal = input.value.trim();

  if (!textoOriginal) {
    renderFilasTabla(tareasCargadasCache);
    return;
  }

  // Si el texto incluye '*' se activa el comodín (igual que en Informes,
  // vía crearRegexFiltro de config.js): '*' equivale a "cualquier texto" y
  // la coincidencia es con el campo COMPLETO, no con una parte cualquiera
  // -p.ej. "factura*" solo casa con lo que EMPIEZA por "factura"; para "en
  // cualquier posición" hay que escribir "*factura*"-. Sin '*' se mantiene
  // la búsqueda de siempre: contiene el texto en cualquier posición.
  let coincide;
  if (textoOriginal.includes('*')) {
    const regexComodin = crearRegexFiltro(textoOriginal);
    coincide = (campo) => regexComodin.test(String(campo || ''));
  } else {
    const texto = textoOriginal.toLowerCase();
    coincide = (campo) => String(campo || '').toLowerCase().includes(texto);
  }

  const filtradas = tareasCargadasCache.filter(item =>
    coincide(item.tarea) || coincide(item.proyecto) || coincide(item.bloque) ||
    coincide(item.comentario) || coincide(item.notas)
  );

  if (filtradas.length === 0) {
    const texto_msg = TEXTOS_FILTRO_SIN_RESULTADOS[idiomaActual] || TEXTOS_FILTRO_SIN_RESULTADOS.es;
    tablaBody.innerHTML = `<div class="tabla-msg">${texto_msg}</div>`;
    return;
  }

  renderFilasTabla(filtradas);
}

const TEXTOS_AVISO_ABIERTA = {
  es: (n) => n === 1 ? '⚠️ Tienes 1 tarea sin hora de fin. Recuerda cerrarla.' : `⚠️ Tienes ${n} tareas sin hora de fin. Recuerda cerrarlas.`,
  gl: (n) => n === 1 ? '⚠️ Tes 1 tarefa sen hora de fin. Lembra pechala.' : `⚠️ Tes ${n} tarefas sen hora de fin. Lembra pechalas.`,
  en: (n) => n === 1 ? '⚠️ You have 1 task without an end time. Remember to close it.' : `⚠️ You have ${n} tasks without an end time. Remember to close them.`
};

/**
 * Aviso visible sobre el listado cuando alguna tarea del día tiene hora de
 * inicio pero no hora de fin (lo habitual tras usar el botón "Ausencia" y
 * no volver a cerrarla). Se recalcula cada vez que se recarga el listado y
 * también al cambiar de idioma, para que el texto quede siempre correcto.
 */
function actualizarAvisoAbiertas(listaTareas) {
  const el = document.getElementById('aviso-abiertas');
  if (!el) return;

  const abiertas = (listaTareas || []).filter(t => t.horainicio && !t.horafin);
  if (abiertas.length === 0) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }

  const detalle = abiertas.map(t => `${t.horainicio} ${t.tarea || ''}`.trim()).join(', ');
  const construirTexto = TEXTOS_AVISO_ABIERTA[idiomaActual] || TEXTOS_AVISO_ABIERTA.es;
  el.textContent = `${construirTexto(abiertas.length)} (${detalle})`;
  el.style.display = 'block';
}

/**
 * Vuelca los datos de un registro guardado en el formulario de entrada.
 * No toca el campo oculto tarea-id: quien llama decide si el envío
 * resultante debe actualizar (editar) o crear un registro nuevo (duplicar).
 */
function poblarFormularioDesdeRegistro(registro) {
  let rawF = String(registro.fecha || '').trim();
  let fDisplay = rawF.includes('T') ? rawF.split('T')[0] : rawF.split(' ')[0];

  document.getElementById('fecha').value = fDisplay;
  document.getElementById('tarea').value = registro.tarea || '';
  document.getElementById('proyecto').value = registro.proyecto || '';
  document.getElementById('bloque').value = registro.bloque || '';
  document.getElementById('horainicio').value = registro.horainicio || '';
  document.getElementById('horafin').value = registro.horafin || '';
  document.getElementById('comentario').value = registro.comentario || '';
  document.getElementById('notas').value = registro.notas || '';
}

function cargarParaEditar(id) {
  const registro = tareasCargadasCache.find(t => t.id === id);
  if (!registro) return;

  poblarFormularioDesdeRegistro(registro);
  document.getElementById('tarea-id').value = registro.id;

  const btnGuardar = document.getElementById('btn-guardar');
  btnGuardar.textContent = TEXTOS_INDEX[idiomaActual].actualizar;
  btnGuardar.style.backgroundColor = '#ffc107';
  btnGuardar.style.color = '#000';
  document.getElementById('btn-cancelar').style.display = 'inline-block';
}

/**
 * Carga un registro existente en el formulario pero SIN su id, de modo que
 * al guardar se cree un registro nuevo en la base de datos en lugar de
 * actualizar el original (útil para repetir una tarea similar).
 */
function cargarParaDuplicar(id) {
  const registro = tareasCargadasCache.find(t => t.id === id);
  if (!registro) return;

  poblarFormularioDesdeRegistro(registro);
  document.getElementById('tarea-id').value = '';

  const btnGuardar = document.getElementById('btn-guardar');
  btnGuardar.textContent = TEXTOS_INDEX[idiomaActual].guardar;
  btnGuardar.style.backgroundColor = '#28a745';
  btnGuardar.style.color = '#fff';
  document.getElementById('btn-cancelar').style.display = 'inline-block';

  document.getElementById('horainicio').focus();
}

function resetearFormulario() {
  document.getElementById('tarea-id').value = '';
  document.getElementById('bloque').value = '';
  document.getElementById('horainicio').value = '';
  document.getElementById('horafin').value = '';
  document.getElementById('comentario').value = '';
  document.getElementById('notas').value = '';

  const btnGuardar = document.getElementById('btn-guardar');
  btnGuardar.textContent = TEXTOS_INDEX[idiomaActual].guardar;
  btnGuardar.style.backgroundColor = '#28a745';
  btnGuardar.style.color = '#fff';
  document.getElementById('btn-cancelar').style.display = 'none';
}

/**
 * Busca, entre las tareas ya guardadas ese mismo día en Supabase, alguna
 * cuyo rango horario se solape con [horaInicio, horaFin). Dos rangos se
 * solapan si cada uno empieza antes de que el otro termine; los que solo
 * se tocan por un extremo (una acaba a las 10:00 y la otra empieza a las
 * 10:00) NO cuentan como solape. Se excluye el propio registro (idExcluir)
 * cuando se está editando, y se ignoran las tareas todavía sin hora de fin
 * (no se puede saber su rango real). Devuelve el registro en conflicto, o
 * null si no hay ninguno o si algo falla al consultar.
 */
async function existeSolapeHorario(fechaStr, horaInicio, horaFin, idExcluir) {
  if (!supabaseClient || !fechaStr || !horaInicio || !horaFin) return null;

  try {
    const { data, error } = await supabaseClient
      .from(TABLA)
      .select('id,tarea,horainicio,horafin')
      .ilike('fecha', `%${fechaStr}%`);

    if (error || !data) return null;

    const inicioNuevo = obtenerMinutosDuracion('00:00', horaInicio);
    const finNuevo = obtenerMinutosDuracion('00:00', horaFin);

    return data.find(r => {
      if (idExcluir && String(r.id) === String(idExcluir)) return false;
      if (!r.horainicio || !r.horafin) return false;
      const inicioOtro = obtenerMinutosDuracion('00:00', r.horainicio);
      const finOtro = obtenerMinutosDuracion('00:00', r.horafin);
      return inicioNuevo < finOtro && inicioOtro < finNuevo;
    }) || null;
  } catch (e) {
    console.error('Error al comprobar solapes de horario:', e);
    return null;
  }
}

/**
 * Guarda (inserta o actualiza, según tarea-id) el registro que haya
 * actualmente en el formulario. Devuelve true si se guardó correctamente,
 * false si hubo algún error o si la validación de horas no pasa. Se usa
 * tanto desde el submit del formulario como desde iniciarFueraEscritorio().
 */
const CLAVE_DIAS_CERRADOS = 'reghor_dias_cerrados';

function obtenerDiasCerrados() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_DIAS_CERRADOS)) || [];
  } catch (e) {
    return [];
  }
}

function esDiaCerrado(fechaStr) {
  return obtenerDiasCerrados().includes(fechaStr);
}

const TEXTOS_DIA_CERRADO = {
  es: '🔒 Este día está cerrado (jornada finalizada). No se pueden añadir nuevas tareas, pero sí editar o eliminar las ya guardadas.',
  gl: '🔒 Este día está pechado (xornada finalizada). Non se poden engadir novas tarefas, pero si editar ou eliminar as xa gardadas.',
  en: '🔒 This day is closed (end of day). No new tasks can be added, but existing ones can still be edited or deleted.'
};
const TEXTOS_BOTON_FINALIZAR = { es: '🔒 Finalizar jornada', gl: '🔒 Rematar xornada', en: '🔒 End day' };
const TEXTOS_BOTON_REABRIR = { es: '🔓 Reabrir jornada', gl: '🔓 Reabrir xornada', en: '🔓 Reopen day' };
const TEXTOS_CONFIRMAR_FINALIZAR = {
  es: '¿Finalizar la jornada de este día? A partir de ahora no se podrán añadir nuevas tareas para esta fecha (sí se podrán seguir editando o eliminando las ya guardadas).',
  gl: '¿Rematar a xornada deste día? A partir de agora non se poderán engadir novas tarefas para esta data (sí se poderán seguir editando ou eliminando as xa gardadas).',
  en: 'End the day for this date? From now on no new tasks can be added for this date (existing ones can still be edited or deleted).'
};

/**
 * Refleja en la UI si la fecha actualmente seleccionada en el formulario
 * está cerrada: muestra/oculta el aviso y cambia el texto/acción del botón
 * Finalizar/Reabrir jornada.
 */
function actualizarEstadoDiaCerrado() {
  const fechaStr = document.getElementById('fecha').value.trim();
  const aviso = document.getElementById('aviso-dia-cerrado');
  const btn = document.getElementById('btn-finalizar-jornada');
  if (!aviso || !btn) return;

  const cerrado = esDiaCerrado(fechaStr);
  aviso.style.display = cerrado ? 'block' : 'none';
  aviso.textContent = TEXTOS_DIA_CERRADO[idiomaActual] || TEXTOS_DIA_CERRADO.es;
  btn.textContent = cerrado
    ? (TEXTOS_BOTON_REABRIR[idiomaActual] || TEXTOS_BOTON_REABRIR.es)
    : (TEXTOS_BOTON_FINALIZAR[idiomaActual] || TEXTOS_BOTON_FINALIZAR.es);
  btn.classList.toggle('btn-dia-cerrado', cerrado);
}

/**
 * Alterna el cierre/reapertura de la jornada de la fecha seleccionada en el
 * formulario. Cerrar el día no borra ni bloquea los registros ya guardados:
 * solo impide crear NUEVOS registros para esa fecha (ver guardarRegistroFormulario).
 */
function alternarFinalizarJornada() {
  const fechaStr = document.getElementById('fecha').value.trim();
  if (!fechaStr) return;

  const dias = obtenerDiasCerrados();
  const idx = dias.indexOf(fechaStr);

  if (idx >= 0) {
    dias.splice(idx, 1);
  } else {
    const texto = TEXTOS_CONFIRMAR_FINALIZAR[idiomaActual] || TEXTOS_CONFIRMAR_FINALIZAR.es;
    if (!confirm(texto)) return;
    dias.push(fechaStr);
  }
  // Si la fecha finalizada/reabierta es la de hoy, actualizarContadorExtra
  // (llamado cada segundo desde iniciarRelojEnVivo) recalcula solo con
  // mirar esDiaCerrado(hoy): a "+00:00:00" al finalizar, en vivo al reabrir.

  localStorage.setItem(CLAVE_DIAS_CERRADOS, JSON.stringify(dias));
  actualizarEstadoDiaCerrado();
}

// ------------------------------------------------------------
// Filtros rápidos de fecha sobre el propio listado (Hoy/Ayer/Semana
// actual/Semana anterior/Mes actual/Mes pasado), para consultar periodos
// anteriores sin tener que abrir Informes. Hoy y Ayer reutilizan la vista
// normal de un solo día (cargarTareas); el resto carga un rango de varios
// días con totales agregados del periodo.
// ------------------------------------------------------------
const TEXTOS_ETIQUETA_RANGO = {
  semana: { es: 'Semana actual', gl: 'Semana actual', en: 'This week' },
  semana_anterior: { es: 'Semana anterior', gl: 'Semana anterior', en: 'Last week' },
  mes: { es: 'Mes actual', gl: 'Mes actual', en: 'This month' },
  mes_anterior: { es: 'Mes pasado', gl: 'Mes pasado', en: 'Last month' },
  personalizado: { es: 'Rango personalizado', gl: 'Intervalo personalizado', en: 'Custom range' }
};
const TEXTOS_VOLVER_HOY = { es: '✕ Volver a hoy', gl: '✕ Volver a hoxe', en: '✕ Back to today' };
const TEXTOS_TEORICA_MODO = {
  dia: { es: 'Jornada Teórica del Día:', gl: 'Xornada Teórica do Día:', en: 'Theoretical Day Hours:' },
  periodo: { es: 'Jornada Teórica del Periodo:', gl: 'Xornada Teórica do Período:', en: 'Theoretical Period Hours:' }
};

/** 'YYYY-MM-DD' → 'DD/MM/YYYY', solo para mostrar (sin depender de otras páginas). */
function formatearFechaCorta(fechaISO) {
  const partes = String(fechaISO || '').split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : (fechaISO || '');
}

function aplicarFiltroRapido(tipo) {
  const { desde, hasta } = calcularRangoFechas(tipo);

  if (tipo === 'hoy' || tipo === 'ayer') {
    document.getElementById('fecha').value = desde;
    cargarTareas();
    return;
  }

  cargarTareasRango(desde, hasta, tipo);
}

const TEXTOS_RANGO_INVALIDO = {
  es: '❌ Introduce una fecha "Desde" y una fecha "Hasta" válidas, con "Desde" igual o anterior a "Hasta".',
  gl: '❌ Introduce unha data "Desde" e unha data "Ata" válidas, con "Desde" igual ou anterior a "Ata".',
  en: '❌ Enter a valid "From" and "To" date, with "From" on or before "To".'
};

/** Filtro de rango personalizado (Desde/Hasta) del listado, para consultar cualquier periodo sin ir a Informes. */
function aplicarFiltroRangoPersonalizado() {
  const desde = document.getElementById('filtro-rango-desde').value.trim();
  const hasta = document.getElementById('filtro-rango-hasta').value.trim();

  if (!desde || !hasta || desde > hasta) {
    alert(TEXTOS_RANGO_INVALIDO[idiomaActual] || TEXTOS_RANGO_INVALIDO.es);
    return;
  }

  cargarTareasRango(desde, hasta, 'personalizado');
}

/**
 * Rellena el desplegable "Mes" con todos los meses de enero al mes actual
 * (ambos incluidos) del año en curso, en el idioma activo. Se vuelve a
 * llamar al cambiar de idioma para traducir las etiquetas.
 */
function poblarSelectorMeses() {
  const sel = document.getElementById('filtro-mes');
  if (!sel) return;

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mesActual = hoy.getMonth(); // 0-indexado
  const meses = MESES[idiomaActual] || MESES.es;

  const valorPrevio = sel.value;
  let opciones = '<option value="" id="opt-filtro-mes-vacio">--</option>';
  for (let m = 0; m <= mesActual; m++) {
    const valor = `${anio}-${String(m + 1).padStart(2, '0')}`;
    const etiqueta = meses[m].charAt(0).toUpperCase() + meses[m].slice(1);
    opciones += `<option value="${valor}">${etiqueta}</option>`;
  }
  sel.innerHTML = opciones;
  if (valorPrevio) sel.value = valorPrevio;
}

/** Filtra el listado al mes elegido en el desplegable "Mes" (del 1 al último día de ese mes). */
function aplicarFiltroMes() {
  const valor = document.getElementById('filtro-mes').value; // 'YYYY-MM'
  if (!valor) return;
  const [anio, mes] = valor.split('-').map(Number);
  const desde = formatearFechaISO(new Date(anio, mes - 1, 1));
  const hasta = formatearFechaISO(new Date(anio, mes, 0));
  cargarTareasRango(desde, hasta, 'personalizado');
}

/**
 * Deja el formulario de filtro (Desde/Hasta/Mes y el texto de búsqueda) como
 * al principio -vacío, solo el formato-, sin tocar qué periodo está viendo
 * ahora mismo el listado (a diferencia de "✕ Volver a hoy", que sí cambia la
 * vista a la jornada de hoy).
 */
function limpiarFiltroRango() {
  const inputDesde = document.getElementById('filtro-rango-desde');
  const inputHasta = document.getElementById('filtro-rango-hasta');
  const selMes = document.getElementById('filtro-mes');
  const inputTexto = document.getElementById('filtro-listado');
  if (inputDesde) inputDesde.value = '';
  if (inputHasta) inputHasta.value = '';
  if (selMes) selMes.value = '';
  if (inputTexto) {
    inputTexto.value = '';
    aplicarFiltroInstantaneo();
  }
}

/** Cambia el rótulo "Jornada Teórica del..." según se esté en vista de un solo día o de un rango. */
function actualizarEtiquetaTeoricaSegunModo() {
  const el = document.getElementById('txt-teorica-label');
  if (!el) return;
  const modo = rangoActivo ? 'periodo' : 'dia';
  el.textContent = (TEXTOS_TEORICA_MODO[modo][idiomaActual] || TEXTOS_TEORICA_MODO[modo].es);
}

/** Muestra u oculta el aviso de rango activo con su etiqueta y el botón para volver a la vista diaria. */
function actualizarEtiquetaRangoActivo() {
  const aviso = document.getElementById('aviso-rango-activo');
  if (!aviso) return;

  if (!rangoActivo) {
    aviso.style.display = 'none';
    aviso.innerHTML = '';
    return;
  }

  const etiquetaObj = TEXTOS_ETIQUETA_RANGO[rangoActivo.tipo];
  const etiqueta = etiquetaObj ? (etiquetaObj[idiomaActual] || etiquetaObj.es) : rangoActivo.tipo;
  const volverTexto = TEXTOS_VOLVER_HOY[idiomaActual] || TEXTOS_VOLVER_HOY.es;

  aviso.style.display = 'flex';
  aviso.innerHTML = `<span>📆 ${etiqueta}: ${formatearFechaCorta(rangoActivo.desde)} – ${formatearFechaCorta(rangoActivo.hasta)}</span><button type="button" class="btn-volver-hoy" onclick="aplicarFiltroRapido('hoy')">${volverTexto}</button>`;
}

/**
 * Carga en el listado todos los registros entre desdeStr y hastaStr (ambos
 * incluidos), sustituyendo la vista normal de un solo día. Pagina con
 * .range() igual que informes.js, por si el periodo (p.ej. un mes) tuviera
 * más de 1000 registros.
 */
async function cargarTareasRango(desdeStr, hastaStr, tipo) {
  rangoActivo = { desde: desdeStr, hasta: hastaStr, tipo };
  actualizarEtiquetaRangoActivo();
  actualizarEtiquetaTeoricaSegunModo();

  const btnFinalizarJornada = document.getElementById('btn-finalizar-jornada');
  if (btnFinalizarJornada) btnFinalizarJornada.disabled = true;
  const avisoDiaCerrado = document.getElementById('aviso-dia-cerrado');
  if (avisoDiaCerrado) avisoDiaCerrado.style.display = 'none';

  const inputFiltroListado = document.getElementById('filtro-listado');
  if (inputFiltroListado) inputFiltroListado.value = '';

  const tablaBody = document.getElementById('tabla-body');
  tablaBody.innerHTML = '<div class="tabla-msg">Cargando datos desde Supabase...</div>';

  try {
    const TAMANO_PAGINA = 1000;
    let tareas = [];
    let desdeIndice = 0;

    while (true) {
      const { data: pagina, error } = await supabaseClient
        .from(TABLA)
        .select('*')
        .gte('fecha', desdeStr)
        .lte('fecha', hastaStr)
        .range(desdeIndice, desdeIndice + TAMANO_PAGINA - 1);

      if (error) {
        console.error('Error al cargar el rango de fechas:', error);
        tablaBody.innerHTML = `<div class="tabla-msg" style="color:red;">Error Supabase: ${error.message}</div>`;
        actualizarAvisoAbiertas([]);
        return;
      }

      tareas = tareas.concat(pagina || []);
      if (!pagina || pagina.length < TAMANO_PAGINA) break;
      desdeIndice += TAMANO_PAGINA;
    }

    // Orden cronológico inverso: la fecha más reciente primero y, dentro de
    // cada fecha, de más tarde a más temprano por hora de inicio -la última
    // tarea registrada aparece arriba del todo-, igual que en la vista de un
    // solo día (cargarTareas).
    tareas.sort((a, b) => {
      const fechaA = String(a.fecha || '');
      const fechaB = String(b.fecha || '');
      if (fechaA !== fechaB) return fechaA > fechaB ? -1 : 1;
      const horaA = a.horainicio || '';
      const horaB = b.horainicio || '';
      if (horaA !== horaB) return horaA > horaB ? -1 : 1;
      return (b.id || 0) - (a.id || 0);
    });

    tareasCargadasCache = tareas;
    actualizarAvisoAbiertas(tareas);

    if (tareas.length === 0) {
      tablaBody.innerHTML = `<div class="tabla-msg">No existen registros guardados entre ${desdeStr} y ${hastaStr}.</div>`;
    } else {
      renderFilasTabla(tareas);
    }

    actualizarResumenRango(tareas, desdeStr, hastaStr);

  } catch (err) {
    console.error('Error inesperado al cargar el rango de fechas:', err);
    tablaBody.innerHTML = `<div class="tabla-msg" style="color:red;">Error al procesar la solicitud.</div>`;
  }
}

/**
 * Totales agregados de un rango de varios días: jornada teórica = suma de
 * la jornada teórica de cada día natural del periodo (festivos/fines de
 * semana ya cuentan 0 automáticamente, tengan o no registros); horas
 * trabajadas = suma por día de las horas brutas menos el descanso de ese
 * día (igual criterio que informes.js), sumado luego entre todos los días
 * con datos; balance = trabajadas - teórica.
 */
function actualizarResumenRango(tareas, desdeStr, hastaStr) {
  let teoricoTotal = 0;
  let cursor = parsearFechaLocal(desdeStr);
  const fin = parsearFechaLocal(hastaStr);
  while (cursor && fin && cursor <= fin) {
    teoricoTotal += obtenerJornadaTeoricaMinutos(formatearFechaISO(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  const minutosPorDia = {};
  tareas.forEach(item => {
    let fechaKey = String(item.fecha || '').trim();
    if (fechaKey.includes('T')) fechaKey = fechaKey.split('T')[0];
    if (fechaKey.includes(' ')) fechaKey = fechaKey.split(' ')[0];
    minutosPorDia[fechaKey] = (minutosPorDia[fechaKey] || 0) + obtenerMinutosDuracion(item.horainicio, item.horafin);
  });

  let totalTrabajado = 0;
  Object.keys(minutosPorDia).forEach(fechaKey => {
    let minutosDia = minutosPorDia[fechaKey];
    if (minutosDia > 0) {
      minutosDia = Math.max(0, minutosDia - obtenerDescansoMinutos(fechaKey));
    }
    totalTrabajado += minutosDia;
  });

  const balanceMinutos = totalTrabajado - teoricoTotal;

  document.getElementById('total-teorica').textContent = formatearMinutosAHoras(teoricoTotal);
  document.getElementById('total-duracion').textContent = formatearMinutosAHoras(totalTrabajado);

  const elBalance = document.getElementById('total-balance');
  const signoStr = balanceMinutos > 0 ? '+' : '';
  elBalance.textContent = `${signoStr}${formatearMinutosAHoras(balanceMinutos)}`;
  elBalance.className = balanceMinutos > 0 ? 'saldo-positivo' : (balanceMinutos < 0 ? 'saldo-negativo' : 'saldo-neutro');
}

async function guardarRegistroFormulario() {
  const id = document.getElementById('tarea-id').value;
  const fechaStr = document.getElementById('fecha').value.trim();
  const horaInicio = document.getElementById('horainicio').value;
  const horaFin = document.getElementById('horafin').value;

  if (!id && esDiaCerrado(fechaStr)) {
    alert('❌ ' + (TEXTOS_DIA_CERRADO[idiomaActual] || TEXTOS_DIA_CERRADO.es));
    return false;
  }

  if (horaInicio && horaFin && horaFin < horaInicio) {
    alert('❌ Error: La Hora Fin no puede ser anterior a la Hora Inicio.');
    return false;
  }

  if (horaInicio && horaFin) {
    const conflicto = await existeSolapeHorario(fechaStr, horaInicio, horaFin, id);
    if (conflicto) {
      alert(`❌ Error: El horario (${horaInicio}-${horaFin}) se solapa con otra tarea ya registrada ese día: ${conflicto.horainicio}-${conflicto.horafin} (${conflicto.tarea || 'sin nombre'}).`);
      return false;
    }
  }

  const registro = {
    fecha: fechaStr,
    tarea: document.getElementById('tarea').value,
    proyecto: document.getElementById('proyecto').value,
    bloque: document.getElementById('bloque').value,
    horainicio: horaInicio,
    horafin: horaFin,
    comentario: document.getElementById('comentario').value,
    notas: document.getElementById('notas').value
  };

  try {
    let response;
    if (id) {
      response = await supabaseClient.from(TABLA).update(registro).eq('id', id);
    } else {
      response = await supabaseClient.from(TABLA).insert([registro]);
    }

    if (response.error) {
      alert('Error de Supabase: ' + response.error.message);
      return false;
    } else {
      resetearFormulario();
      // Si se estaba viendo un rango (Semana/Mes), se recarga ese mismo
      // rango en vez de volver a la vista de un solo día, para no perder
      // de vista el resto de registros del periodo tras guardar/editar uno.
      if (rangoActivo) {
        await cargarTareasRango(rangoActivo.desde, rangoActivo.hasta, rangoActivo.tipo);
      } else {
        await cargarTareas();
      }
      // El contador de tiempo efectivo y el % de rendimiento de la cabecera
      // siempre reflejan HOY, sea cual sea el día/rango que se esté viendo.
      await refrescarRegistrosHoyContador();
      return true;
    }
  } catch (err) {
    alert('Error de red al conectar con Supabase.');
    return false;
  }
}

document.getElementById('tarea-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await guardarRegistroFormulario();
});

/**
 * Botón "Ausencia": si el formulario tiene una tarea en curso (con hora de
 * inicio pero todavía sin hora de fin, porque es la tarea que se estaba
 * haciendo justo antes de levantarse), se le rellena automáticamente la
 * hora de fin con la hora actual y se guarda (igual que pulsar
 * Guardar/Actualizar), para no perder ese registro. Si el formulario ya
 * tenía hora de fin puesta a mano, se respeta tal cual. A continuación se
 * crea y guarda automáticamente (sin esperar a que el usuario pulse
 * Guardar) un nuevo registro de ausencia con fecha de hoy, tarea "Fuera
 * escritorio", proyecto "FES" y tanto la hora de inicio como la hora de
 * fin puestas a la hora actual (marcador de que la ausencia empieza ahora
 * mismo); más tarde, al volver, se corrige a mano la hora de fin real
 * editando ese mismo registro (doble clic sobre la fila).
 */
async function iniciarAusencia() {
  const form = document.getElementById('tarea-form');

  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  const inputHoraFin = document.getElementById('horafin');
  if (document.getElementById('horainicio').value && !inputHoraFin.value) {
    inputHoraFin.value = horaActual;
  }

  if (form.checkValidity()) {
    const guardadoOk = await guardarRegistroFormulario();
    if (!guardadoOk) return;
  }

  document.getElementById('tarea-id').value = '';
  document.getElementById('fecha').value = obtenerFechaHoyISO();
  document.getElementById('tarea').value = 'Fuera escritorio';
  document.getElementById('proyecto').value = 'FES';
  document.getElementById('bloque').value = 'GENERAL';
  document.getElementById('horainicio').value = horaActual;
  document.getElementById('horafin').value = horaActual;
  document.getElementById('comentario').value = 'Ausencia';
  document.getElementById('notas').value = '';

  // Se guarda de inmediato: no se deja pendiente de que el usuario pulse Guardar.
  await guardarRegistroFormulario();
}

async function borrarTarea(id) {
  if (confirm('¿Eliminar este registro?')) {
    await supabaseClient.from(TABLA).delete().eq('id', id);
    if (rangoActivo) {
      await cargarTareasRango(rangoActivo.desde, rangoActivo.hasta, rangoActivo.tipo);
    } else {
      cargarTareas();
    }
    await refrescarRegistrosHoyContador();
  }
}

// ------------------------------------------------------------
// Menú contextual (clic derecho) de cada fila: sustituye a los antiguos
// botones Editar/Duplicar/Eliminar de cada registro, para dejar la
// pantalla más limpia.
// ------------------------------------------------------------
let idMenuContextual = null;

function mostrarMenuContextual(event, id) {
  event.preventDefault();
  event.stopPropagation();
  idMenuContextual = id;

  const menu = document.getElementById('menu-contextual');
  if (!menu) return;

  menu.style.display = 'block';
  const anchoMenu = menu.offsetWidth || 160;
  const altoMenu = menu.offsetHeight || 120;
  const x = Math.max(4, Math.min(event.clientX, window.innerWidth - anchoMenu - 8));
  const y = Math.max(4, Math.min(event.clientY, window.innerHeight - altoMenu - 8));
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function ocultarMenuContextual() {
  const menu = document.getElementById('menu-contextual');
  if (menu) menu.style.display = 'none';
  idMenuContextual = null;
}

function accionMenuContextual(accion) {
  const id = idMenuContextual;
  ocultarMenuContextual();
  if (id == null) return;

  if (accion === 'editar') cargarParaEditar(id);
  else if (accion === 'duplicar') cargarParaDuplicar(id);
  else if (accion === 'eliminar') borrarTarea(id);
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('menu-contextual');
  if (menu && menu.style.display === 'block' && !menu.contains(e.target)) {
    ocultarMenuContextual();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') ocultarMenuContextual();
});
document.addEventListener('scroll', () => ocultarMenuContextual(), true);

async function actualizarResumenHoras(listaTareas, fechaStr) {
  let totalMinutosReales = 0;

  listaTareas.forEach(item => {
    totalMinutosReales += obtenerMinutosDuracion(item.horainicio, item.horafin);
  });

  // Descuento de 00:30 (lunes a jueves, periodo 1 sept - 30 jun) sobre las
  // horas realmente trabajadas. El balance de horas extra, al calcularse a
  // partir de este total, hereda automáticamente el mismo descuento.
  if (totalMinutosReales > 0) {
    const descanso = obtenerDescansoMinutos(fechaStr);
    totalMinutosReales = Math.max(0, totalMinutosReales - descanso);
  }

  // En viernes, la jornada teórica del día es la que realmente queda
  // pendiente tras lo ya trabajado de lunes a jueves esa semana (ver
  // obtenerJornadaTeoricaAjustada en config.js); el resto de días usa la
  // jornada teórica fija de siempre.
  const minutosTeoricos = await obtenerJornadaTeoricaAjustada(fechaStr);
  const balanceMinutos = totalMinutosReales - minutosTeoricos;

  document.getElementById('total-teorica').textContent = formatearMinutosAHoras(minutosTeoricos);
  document.getElementById('total-duracion').textContent = formatearMinutosAHoras(totalMinutosReales);

  const elBalance = document.getElementById('total-balance');
  const signoStr = balanceMinutos > 0 ? '+' : '';
  elBalance.textContent = `${signoStr}${formatearMinutosAHoras(balanceMinutos)}`;

  elBalance.className = balanceMinutos > 0 ? 'saldo-positivo' : (balanceMinutos < 0 ? 'saldo-negativo' : 'saldo-neutro');
}

const TEXTOS_INDEX = {
  es: {
    titulo: 'REGHOR', fecha: 'Fecha', tarea: 'Tarea', proyecto: 'Proyecto', bloque: 'Bloque',
    horainicio: 'Hora inicio', horafin: 'Hora fin', comentario: 'Comentario', notas: 'Notas',
    acciones: 'Acciones', listado: 'Listado de tareas', informes: '📊 Informes', graficos: '📈 Gráficos', semana: '📅 Registro Semana',
    ausencia: '🚶 Ausencia',
    guardar: 'Guardar', actualizar: 'Actualizar', cancelar: 'Cancelar',
    teorica: 'Jornada Teórica del Día:', total: 'Total Horas Trabajadas:', balance: 'Balance / Horas Extra:',
    menuEditar: '✏️ Editar', menuDuplicar: '📋 Duplicar', menuEliminar: '🗑️ Eliminar',
    filtroPlaceholder: '🔎 Filtrar por tarea, proyecto, bloque, comentario o notas... (usa * como comodín)',
    filtroHoy: 'Hoy', filtroAyer: 'Ayer', filtroSemana: 'Esta semana', filtroSemanaAnterior: 'Semana pasada',
    filtroMes: 'Este mes', filtroMesAnterior: 'Mes pasado',
    rangoDesde: 'Desde', rangoHasta: 'Hasta', rangoFiltrar: '🔍 Filtrar',
    rangoMes: 'Mes', rangoLimpiar: '🧹 Limpiar filtro'
  },
  gl: {
    titulo: 'REGHOR', fecha: 'Data', tarea: 'Tarefa', proyecto: 'Proxecto', bloque: 'Bloque',
    horainicio: 'Hora inicio', horafin: 'Hora fin', comentario: 'Comentario', notas: 'Notas',
    acciones: 'Accións', listado: 'Listaxe de tarefas', informes: '📊 Informes', graficos: '📈 Gráficas', semana: '📅 Rexistro Semana',
    ausencia: '🚶 Ausencia',
    guardar: 'Gardar', actualizar: 'Actualizar', cancelar: 'Cancelar',
    teorica: 'Xornada Teórica do Día:', total: 'Total Horas Traballadas:', balance: 'Balance / Horas Extra:',
    menuEditar: '✏️ Editar', menuDuplicar: '📋 Duplicar', menuEliminar: '🗑️ Eliminar',
    filtroPlaceholder: '🔎 Filtrar por tarefa, proxecto, bloque, comentario ou notas... (usa * como comodín)',
    filtroHoy: 'Hoxe', filtroAyer: 'Onte', filtroSemana: 'Esta semana', filtroSemanaAnterior: 'Semana pasada',
    filtroMes: 'Este mes', filtroMesAnterior: 'Mes pasado',
    rangoDesde: 'Desde', rangoHasta: 'Ata', rangoFiltrar: '🔍 Filtrar',
    rangoMes: 'Mes', rangoLimpiar: '🧹 Limpar filtro'
  },
  en: {
    titulo: 'REGHOR', fecha: 'Date', tarea: 'Task', proyecto: 'Project', bloque: 'Block',
    horainicio: 'Start Time', horafin: 'End Time', comentario: 'Comment', notas: 'Notes',
    acciones: 'Actions', listado: 'Task list', informes: '📊 Reports', graficos: '📈 Charts', semana: '📅 Week Log',
    ausencia: '🚶 Absence',
    guardar: 'Save', actualizar: 'Update', cancelar: 'Cancel',
    teorica: 'Theoretical Day Hours:', total: 'Total Hours Worked:', balance: 'Balance / Overtime:',
    menuEditar: '✏️ Edit', menuDuplicar: '📋 Duplicate', menuEliminar: '🗑️ Delete',
    filtroPlaceholder: '🔎 Filter by task, project, block, comment or notes... (use * as wildcard)',
    filtroHoy: 'Today', filtroAyer: 'Yesterday', filtroSemana: 'This week', filtroSemanaAnterior: 'Last week',
    filtroMes: 'This month', filtroMesAnterior: 'Last month',
    rangoDesde: 'From', rangoHasta: 'To', rangoFiltrar: '🔍 Filter',
    rangoMes: 'Month', rangoLimpiar: '🧹 Clear filter'
  }
};

function cambiarIdioma(lang) {
  idiomaActual = lang;
  const t = TEXTOS_INDEX[lang];

  actualizarTituloConDia();
  document.getElementById('lbl-fecha').textContent = t.fecha;
  document.getElementById('lbl-tarea').textContent = t.tarea;
  document.getElementById('lbl-proyecto').textContent = t.proyecto;
  document.getElementById('lbl-bloque').textContent = t.bloque;
  document.getElementById('lbl-horainicio').textContent = t.horainicio;
  document.getElementById('lbl-horafin').textContent = t.horafin;
  document.getElementById('lbl-comentario').textContent = t.comentario;
  document.getElementById('lbl-notas').textContent = t.notas;
  document.getElementById('txt-listado').textContent = t.listado;
  document.getElementById('btn-informes').textContent = t.informes;
  document.getElementById('btn-graficos').textContent = t.graficos;
  document.getElementById('btn-semana').textContent = t.semana;
  document.getElementById('btn-ausencia').textContent = t.ausencia;
  document.getElementById('btn-cancelar').textContent = t.cancelar;

  const idEditando = document.getElementById('tarea-id').value;
  document.getElementById('btn-guardar').textContent = idEditando ? t.actualizar : t.guardar;

  document.getElementById('txt-teorica-label').textContent = t.teorica;
  document.getElementById('txt-total-label').textContent = t.total;
  document.getElementById('txt-balance-label').textContent = t.balance;

  poblarSelectorMeses();

  document.getElementById('th-fecha').textContent = t.fecha;
  document.getElementById('th-tarea').textContent = t.tarea;
  document.getElementById('th-proyecto').textContent = t.proyecto;
  document.getElementById('th-bloque').textContent = t.bloque;
  document.getElementById('th-inicio').textContent = t.horainicio;
  document.getElementById('th-fin').textContent = t.horafin;
  document.getElementById('th-duracion').textContent = (lang === 'en') ? 'Duration' : 'Duración';
  document.getElementById('th-comentario').textContent = t.comentario;
  document.getElementById('th-notas').textContent = t.notas;

  const btnMenuEditar = document.getElementById('menu-opcion-editar');
  const btnMenuDuplicar = document.getElementById('menu-opcion-duplicar');
  const btnMenuEliminar = document.getElementById('menu-opcion-eliminar');
  if (btnMenuEditar) btnMenuEditar.textContent = t.menuEditar;
  if (btnMenuDuplicar) btnMenuDuplicar.textContent = t.menuDuplicar;
  if (btnMenuEliminar) btnMenuEliminar.textContent = t.menuEliminar;

  const inputFiltro = document.getElementById('filtro-listado');
  if (inputFiltro) inputFiltro.placeholder = t.filtroPlaceholder;

  const btnFiltroHoy = document.getElementById('btn-filtro-hoy');
  const btnFiltroAyer = document.getElementById('btn-filtro-ayer');
  const btnFiltroSemana = document.getElementById('btn-filtro-semana');
  const btnFiltroSemanaAnterior = document.getElementById('btn-filtro-semana-anterior');
  const btnFiltroMes = document.getElementById('btn-filtro-mes');
  const btnFiltroMesAnterior = document.getElementById('btn-filtro-mes-anterior');
  if (btnFiltroHoy) btnFiltroHoy.textContent = t.filtroHoy;
  if (btnFiltroAyer) btnFiltroAyer.textContent = t.filtroAyer;
  if (btnFiltroSemana) btnFiltroSemana.textContent = t.filtroSemana;
  if (btnFiltroSemanaAnterior) btnFiltroSemanaAnterior.textContent = t.filtroSemanaAnterior;
  if (btnFiltroMes) btnFiltroMes.textContent = t.filtroMes;
  if (btnFiltroMesAnterior) btnFiltroMesAnterior.textContent = t.filtroMesAnterior;

  const lblRangoMes = document.getElementById('lbl-rango-mes');
  const lblRangoDesde = document.getElementById('lbl-rango-desde');
  const lblRangoHasta = document.getElementById('lbl-rango-hasta');
  const btnFiltrarRango = document.getElementById('btn-filtrar-rango');
  const btnLimpiarFiltro = document.getElementById('btn-limpiar-filtro');
  if (lblRangoMes) lblRangoMes.textContent = t.rangoMes;
  if (lblRangoDesde) lblRangoDesde.textContent = t.rangoDesde;
  if (lblRangoHasta) lblRangoHasta.textContent = t.rangoHasta;
  if (btnFiltrarRango) btnFiltrarRango.textContent = t.rangoFiltrar;
  if (btnLimpiarFiltro) btnLimpiarFiltro.textContent = t.rangoLimpiar;

  actualizarEstadoDiaCerrado();
  actualizarEtiquetaTeoricaSegunModo();
  actualizarEtiquetaRangoActivo();

  poblarSelects();
  actualizarAvisoAbiertas(tareasCargadasCache);
}