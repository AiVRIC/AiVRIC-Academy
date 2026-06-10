/**
 * AiVRIC Academy — Authentication Module
 * Handles magic link, Google/Microsoft OAuth, and WebAuthn passkeys
 * via Supabase Auth. Requires academy-config.js to be loaded first.
 */
(function () {
  'use strict';

  /* ── Supabase client ──────────────────────────────────────────────── */
  var cfg = window.ACADEMY_CONFIG;
  var supabase = null;

  function initSupabase() {
    if (supabase) return supabase;
    if (!window.supabase || !window.supabase.createClient) {
      console.warn('AiVRIC Academy: Supabase SDK not loaded.');
      return null;
    }
    supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        redirectTo: cfg.authRedirectUrl,
      }
    });
    return supabase;
  }

  /* ── Session helpers ──────────────────────────────────────────────── */
  async function getSession() {
    var sb = initSupabase();
    if (!sb) return null;
    try {
      var { data } = await sb.auth.getSession();
      return data && data.session ? data.session : null;
    } catch(e) { return null; }
  }

  async function getUser() {
    var sess = await getSession();
    return sess ? sess.user : null;
  }

  /* ── Sign in with magic link ──────────────────────────────────────── */
  async function signInWithEmail(email) {
    var sb = initSupabase();
    if (!sb) throw new Error('Supabase not initialised');
    var { error } = await sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: cfg.authRedirectUrl }
    });
    if (error) throw error;
  }

  /* ── Sign in with OAuth provider ─────────────────────────────────── */
  async function signInWithOAuth(provider) {
    var sb = initSupabase();
    if (!sb) throw new Error('Supabase not initialised');
    var { error } = await sb.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: cfg.authRedirectUrl }
    });
    if (error) throw error;
  }

  /* ── WebAuthn / Passkeys ──────────────────────────────────────────── */
  /* Passkeys require a Supabase Edge Function for challenge generation  */
  /* and credential verification. See supabase/functions/passkey/        */
  /* in the Academy repo for the full server-side implementation.        */

  var PASSKEY_FUNCTION_URL = cfg.supabaseUrl + '/functions/v1/passkey';

  async function registerPasskey(user) {
    if (!navigator.credentials || !window.PublicKeyCredential) {
      throw new Error('This browser does not support passkeys.');
    }
    var sb = initSupabase();
    if (!sb) throw new Error('Supabase not initialised');
    var sess = await getSession();
    if (!sess) throw new Error('Must be signed in to register a passkey.');

    /* 1. Get challenge from Edge Function */
    var challengeResp = await fetch(PASSKEY_FUNCTION_URL + '/register/begin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sess.access_token,
      },
    });
    if (!challengeResp.ok) throw new Error('Failed to start passkey registration.');
    var options = await challengeResp.json();

    /* 2. Convert base64url → ArrayBuffer for the browser API */
    options.challenge = _b64ToBuffer(options.challenge);
    options.user.id   = _b64ToBuffer(options.user.id);
    if (options.excludeCredentials) {
      options.excludeCredentials = options.excludeCredentials.map(function(c) {
        return Object.assign({}, c, { id: _b64ToBuffer(c.id) });
      });
    }

    /* 3. Browser creates credential */
    var credential = await navigator.credentials.create({ publicKey: options });

    /* 4. Send attestation to Edge Function for verification */
    var verifyResp = await fetch(PASSKEY_FUNCTION_URL + '/register/finish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sess.access_token,
      },
      body: JSON.stringify(_credentialToJSON(credential)),
    });
    if (!verifyResp.ok) throw new Error('Passkey registration failed.');
    return await verifyResp.json();
  }

  async function signInWithPasskey() {
    if (!navigator.credentials || !window.PublicKeyCredential) {
      throw new Error('This browser does not support passkeys.');
    }
    var sb = initSupabase();
    if (!sb) throw new Error('Supabase not initialised');

    /* 1. Get challenge */
    var challengeResp = await fetch(PASSKEY_FUNCTION_URL + '/authenticate/begin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!challengeResp.ok) throw new Error('Failed to start passkey authentication.');
    var options = await challengeResp.json();
    options.challenge = _b64ToBuffer(options.challenge);
    if (options.allowCredentials) {
      options.allowCredentials = options.allowCredentials.map(function(c) {
        return Object.assign({}, c, { id: _b64ToBuffer(c.id) });
      });
    }

    /* 2. Browser asserts credential */
    var assertion = await navigator.credentials.get({ publicKey: options });

    /* 3. Verify and get Supabase JWT */
    var verifyResp = await fetch(PASSKEY_FUNCTION_URL + '/authenticate/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_credentialToJSON(assertion)),
    });
    if (!verifyResp.ok) throw new Error('Passkey authentication failed.');
    var { access_token, refresh_token } = await verifyResp.json();
    var { error } = await sb.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
  }

  /* ── Sign out ─────────────────────────────────────────────────────── */
  async function signOut() {
    var sb = initSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    window.dispatchEvent(new CustomEvent('academy:signedout'));
  }

  /* ── Auth state change ────────────────────────────────────────────── */
  function onAuthStateChange(callback) {
    var sb = initSupabase();
    if (!sb) return function(){};
    var { data: { subscription } } = sb.auth.onAuthStateChange(function(event, session) {
      callback(event, session ? session.user : null, session);
    });
    return function() { subscription.unsubscribe(); };
  }

  /* ── Inject header user chip ──────────────────────────────────────── */
  function injectHeaderAuthState() {
    var topLinks = document.querySelector('.acad-top-links');
    if (!topLinks) return;

    var chip = document.createElement('div');
    chip.className = 'acad-user-chip';
    chip.id = 'acad-user-chip';
    chip.innerHTML = '<span class="acad-user-chip-loading"><i class="fas fa-circle-notch fa-spin"></i></span>';
    topLinks.insertBefore(chip, topLinks.firstChild);

    getUser().then(function(user) {
      if (user) {
        var name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email.split('@')[0];
        var initials = name.split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
        chip.innerHTML =
          '<a class="acad-user-chip-btn" href="dashboard.html" title="My Profile">' +
          '<span class="acad-user-avatar">' + initials + '</span>' +
          '<span class="acad-user-chip-name">' + _esc(name.split(' ')[0]) + '</span>' +
          '</a>';
      } else {
        chip.style.display = 'none';
      }
    }).catch(function() {
      chip.style.display = 'none';
    });
  }

  /* ── Utilities ────────────────────────────────────────────────────── */
  function _b64ToBuffer(b64) {
    var bin = atob(b64.replace(/-/g,'+').replace(/_/g,'/'));
    var buf = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  function _bufToB64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = '';
    bytes.forEach(function(b){ bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  }

  function _credentialToJSON(cred) {
    var json = { id: cred.id, type: cred.type, rawId: _bufToB64(cred.rawId) };
    if (cred.response) {
      json.response = {};
      if (cred.response.clientDataJSON)    json.response.clientDataJSON    = _bufToB64(cred.response.clientDataJSON);
      if (cred.response.attestationObject) json.response.attestationObject = _bufToB64(cred.response.attestationObject);
      if (cred.response.authenticatorData) json.response.authenticatorData = _bufToB64(cred.response.authenticatorData);
      if (cred.response.signature)         json.response.signature         = _bufToB64(cred.response.signature);
      if (cred.response.userHandle)        json.response.userHandle        = _bufToB64(cred.response.userHandle);
    }
    return json;
  }

  function _esc(str) {
    return str.replace(/[&<>"']/g, function(c){
      return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  /* ── Public API ───────────────────────────────────────────────────── */
  window.AcademyAuth = {
    init:              initSupabase,
    getSession:        getSession,
    getUser:           getUser,
    signInWithEmail:   signInWithEmail,
    signInWithOAuth:   signInWithOAuth,
    registerPasskey:   registerPasskey,
    signInWithPasskey: signInWithPasskey,
    signOut:           signOut,
    onAuthStateChange: onAuthStateChange,
    injectHeaderAuthState: injectHeaderAuthState,
  };

  /* Auto-inject on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHeaderAuthState);
  } else {
    injectHeaderAuthState();
  }
})();
