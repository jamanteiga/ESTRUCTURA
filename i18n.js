// i18n.js — Motor de traducción de ESTRUCTURA.
// Requiere que traducciones.js se cargue ANTES que este script.
//
// Uso en HTML (texto estático):
//   <span data-i18n="nav.inicio">Inicio</span>
//   <input data-i18n-placeholder="buscador.placeholder" placeholder="...">
//   <div data-i18n-title="clave.titulo" title="...">
//
// Uso en JS (texto dinámico, con variables):
//   elemento.textContent = t('cascada.contador', { n: idsActuales.length });
//
// Cambiar de idioma: cambiarIdioma('en') — guarda la preferencia y recarga.

const IDIOMAS_DISPONIBLES = ['es', 'en', 'pt', 'ko', 'gl'];
const IDIOMA_POR_DEFECTO = 'es';
const CLAVE_LOCALSTORAGE_IDIOMA = 'estructura_idioma';

function idiomaActual() {
  try {
    const guardado = localStorage.getItem(CLAVE_LOCALSTORAGE_IDIOMA);
    if (guardado && IDIOMAS_DISPONIBLES.includes(guardado)) return guardado;
  } catch (e) {
    // localStorage no disponible (modo privado, permisos, etc.): usamos el idioma por defecto
  }
  return IDIOMA_POR_DEFECTO;
}

function t(clave, vars) {
  const entrada = (typeof TRADUCCIONES !== 'undefined') ? TRADUCCIONES[clave] : null;
  let texto = entrada ? (entrada[idiomaActual()] || entrada[IDIOMA_POR_DEFECTO] || clave) : clave;
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      texto = texto.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    });
  }
  return texto;
}

function cambiarIdioma(codigo) {
  if (!IDIOMAS_DISPONIBLES.includes(codigo)) return;
  try {
    localStorage.setItem(CLAVE_LOCALSTORAGE_IDIOMA, codigo);
  } catch (e) {
    // si no se puede guardar, seguimos adelante igualmente para esta sesión
  }
  location.reload();
}

function aplicarIdioma() {
  const idioma = idiomaActual();
  document.documentElement.lang = idioma;

  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
    el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
  });

  // Marca visualmente el idioma activo dentro del submenú "Idiomas"
  document.querySelectorAll('.idioma-check').forEach(function (el) {
    el.style.visibility = (el.getAttribute('data-idioma') === idioma) ? 'visible' : 'hidden';
  });
}

document.addEventListener('DOMContentLoaded', aplicarIdioma);
