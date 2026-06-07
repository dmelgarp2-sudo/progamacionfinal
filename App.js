

const API_LOGIN    = 'https://backcvbgtmdesa.azurewebsites.net/api/login/authenticate';
const API_MENSAJES = 'https://backcvbgtmdesa.azurewebsites.net/api/Mensajes';

let sessionToken = null;
let sessionUser  = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById(id);
  target.style.display = 'flex';
  requestAnimationFrame(() => target.classList.add('active'));
}

function setButtonLoading(btn, loading) {
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled        = loading;
  text.style.opacity  = loading ? '0' : '1';
  loader.classList.toggle('hidden', !loading);
}

function showAlert(elementId, visible, message = '') {
  const el = document.getElementById(elementId);
  el.classList.toggle('hidden', !visible);
  if (message) {
    const span = el.querySelector('span');
    if (span) span.textContent = message;
  }
}

async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  showAlert('login-error', false);

  if (!username || !password) {
    showAlert('login-error', true, 'Por favor complete todos los campos.');
    return;
  }

  const btn = document.getElementById('btn-login');
  setButtonLoading(btn, true);

  try {
    const response = await fetch(API_LOGIN, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ Username: username, Password: password })
    });

    const rawText = await response.text();

    if (!response.ok) {
      let apiMsg = 'Usuario o contraseña incorrectos.';
      try {
        const parsed = JSON.parse(rawText);
        if (parsed.msgRespuesta) apiMsg = parsed.msgRespuesta;
      } catch { /* ignorar */ }
      throw new Error(apiMsg);
    }

    const data  = JSON.parse(rawText);
    const token = data.token || data.Token || data.accessToken || data.access_token ||
                  (data.data && (data.data.token || data.data.accessToken)) || null;

    if (!token) {
      throw new Error('El servidor no devolvió un token válido.');
    }
   
    sessionStorage.setItem('miumg_token', token);
    sessionStorage.setItem('miumg_user',  username);
    sessionToken = token;
    sessionUser  = username;

    document.getElementById('userNameDisplay').textContent = username;
    document.getElementById('userAvatar').textContent      = username.charAt(0).toUpperCase();

    showScreen('screen-messages');

  } catch (err) {
    let msg = err.message || 'Error al autenticar. Intente nuevamente.';
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      msg = 'No se pudo conectar al servidor. Compruebe su conexión.';
    }
    showAlert('login-error', true, msg);
  } finally {
    setButtonLoading(btn, false);
  }
}


async function handleSendMessage() {
  const contenido = document.getElementById('messageContent').value.trim();

  showAlert('msg-success', false);
  showAlert('msg-error',   false);

  if (!contenido) {
    document.getElementById('msg-error-text').textContent = 'El mensaje no puede estar vacío.';
    showAlert('msg-error', true);
    return;
  }

  if (!sessionToken || !sessionUser) {
    document.getElementById('msg-error-text').textContent = 'Su sesión ha expirado. Inicie sesión nuevamente.';
    showAlert('msg-error', true);
    setTimeout(handleLogout, 1800);
    return;
  }

  const btn = document.getElementById('btn-send');
  setButtonLoading(btn, true);

  try {
    const response = await fetch(API_MENSAJES, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        Cod_Sala:     0,
        Login_Emisor: sessionUser,
        Contenido:    contenido
      })
    });

    if (!response.ok) {
      const rawText = await response.text().catch(() => '');
      let apiMsg = `Error del servidor (${response.status}).`;
      try {
        const parsed = JSON.parse(rawText);
        if (parsed.msgRespuesta) apiMsg = parsed.msgRespuesta;
      } catch { /* ignorar */ }
      if (response.status === 401 || response.status === 403) {
        apiMsg = 'Token inválido o expirado. Cierre sesión e ingrese nuevamente.';
      }
      throw new Error(apiMsg);
    }

    document.getElementById('messageContent').value = '';
    document.getElementById('charCount').textContent = '0 / 1000';
    showAlert('msg-success', true, 'Mensaje enviado correctamente.');
    setTimeout(() => showAlert('msg-success', false), 4000);

  } catch (err) {
    let msg = err.message || 'Error al enviar. Intente nuevamente.';
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      msg = 'No se pudo conectar al servidor.';
    }
    document.getElementById('msg-error-text').textContent = msg;
    showAlert('msg-error', true);
  } finally {
    setButtonLoading(btn, false);
  }
}

function handleLogout() {
  sessionToken = null;
  sessionUser  = null;
  sessionStorage.removeItem('miumg_token');
  sessionStorage.removeItem('miumg_user');

  document.getElementById('username').value        = '';
  document.getElementById('password').value        = '';
  document.getElementById('messageContent').value  = '';
  document.getElementById('charCount').textContent = '0 / 1000';
  showAlert('msg-success', false);
  showAlert('msg-error',   false);
  showAlert('login-error', false);

  showScreen('screen-login');
}

function initPasswordToggle() {
  const btn   = document.getElementById('togglePass');
  const input = document.getElementById('password');
  const icon  = document.getElementById('eyeIcon');

  const eyeOpen   = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  const eyeClosed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type   = isPass ? 'text' : 'password';
    icon.innerHTML = isPass ? eyeClosed : eyeOpen;
  });
}

function initCharCounter() {
  const textarea = document.getElementById('messageContent');
  const counter  = document.getElementById('charCount');
  textarea.addEventListener('input', () => {
    counter.textContent = `${textarea.value.length} / 1000`;
  });
}

function initEnterKey() {
  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('username').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('password').focus();
  });
}

function tryRestoreSession() {
  const token = sessionStorage.getItem('miumg_token');
  const user  = sessionStorage.getItem('miumg_user');
  if (token && user) {
    sessionToken = token;
    sessionUser  = user;
    document.getElementById('userNameDisplay').textContent = user;
    document.getElementById('userAvatar').textContent      = user.charAt(0).toUpperCase();
    showScreen('screen-messages');
  } else {
    showScreen('screen-login');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-login').addEventListener('click', handleLogin);
  document.getElementById('btn-send').addEventListener('click', handleSendMessage);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  initPasswordToggle();
  initCharCounter();
  initEnterKey();
  tryRestoreSession();
});