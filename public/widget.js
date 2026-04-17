/**
 * OptiChatBot — Widget embebible
 * Uso: <script src="https://optichatbot.vercel.app/widget.js" data-token="TU_TOKEN"></script>
 * Opcional: data-tone="amigable|formal|tecnico"
 */
(function () {
  'use strict';

  var script   = document.currentScript || document.querySelector('script[data-token]');
  var token    = script ? script.getAttribute('data-token') : null;
  var tone     = script ? (script.getAttribute('data-tone') || 'amigable') : 'amigable';
  var apiBase  = script ? (script.getAttribute('data-api') || 'https://optichatbot.vercel.app') : 'https://optichatbot.vercel.app';

  if (!token) {
    console.warn('[OptiChatBot] data-token no encontrado. Widget no iniciado.');
    return;
  }

  // Cargar en iframe
  var iframe = document.createElement('iframe');
  iframe.src = apiBase + '/widget/' + token + '?tone=' + tone;
  iframe.style.cssText = [
    'position:fixed',
    'bottom:0',
    'right:0',
    'width:420px',
    'height:640px',
    'border:none',
    'z-index:999999',
    'background:transparent',
    'pointer-events:all',
  ].join(';');
  iframe.setAttribute('title', 'OptiChatBot');
  iframe.setAttribute('allow', 'clipboard-write');

  document.body.appendChild(iframe);
})();
