/* =============================================================
   Mohsin & Sakshi — site behaviour
   ============================================================= */

(function () {
  'use strict';

  /* -----------------------------------------------------------
     CONFIG — paste your Apps Script Web App URL here after
     deploying apps-script/Code.gs. See apps-script/SETUP.md.
     ----------------------------------------------------------- */
  var CONFIG = {
    RSVP_ENDPOINT: '',
    CONTACT_EMAIL: 'mohsin.salim567@gmail.com',
    // Haldi begins 19 March 2027, 15:30 Bali time (WITA, UTC+8)
    WEDDING_ISO: '2027-03-19T15:30:00+08:00'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===========================================================
     1. The gate
     =========================================================== */

  var gate = document.getElementById('gate');
  var seal = document.getElementById('seal');

  function openGate() {
    if (!gate || gate.classList.contains('is-open')) return;
    gate.classList.add('is-open');
    document.body.classList.remove('is-locked');

    var done = function () {
      gate.hidden = true;
      var h1 = document.querySelector('.hero__names');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    };
    if (reduceMotion) { done(); }
    else { window.setTimeout(done, 1400); }
  }

  if (seal) {
    seal.addEventListener('click', openGate);
    // Anyone who lands mid-page (e.g. a #rsvp link) skips the gate.
    if (window.location.hash && window.location.hash !== '#top') {
      gate.hidden = true;
      document.body.classList.remove('is-locked');
    } else {
      window.setTimeout(function () { seal.focus({ preventScroll: true }); }, 400);
    }
  } else {
    document.body.classList.remove('is-locked');
  }

  /* ===========================================================
     2. Countdown
     =========================================================== */

  var clock = document.getElementById('clock');

  if (clock) {
    var target = new Date(CONFIG.WEDDING_ISO).getTime();
    var cells = {};
    Array.prototype.forEach.call(
      clock.querySelectorAll('[data-unit]'),
      function (el) { cells[el.getAttribute('data-unit')] = el; }
    );

    var pad = function (n) { return n < 10 ? '0' + n : String(n); };

    var tick = function () {
      var left = target - Date.now();

      if (left <= 0) {
        clock.innerHTML =
          '<p class="lede" style="grid-column:1/-1;margin:0">' +
          'The day is here. See you in Bali.</p>';
        window.clearInterval(timer);
        return;
      }

      var s = Math.floor(left / 1000);
      var set = function (k, v) { if (cells[k]) cells[k].textContent = v; };
      set('days',    String(Math.floor(s / 86400)));
      set('hours',   pad(Math.floor(s / 3600) % 24));
      set('minutes', pad(Math.floor(s / 60) % 60));
      set('seconds', pad(s % 60));
    };

    tick();
    var timer = window.setInterval(tick, 1000);
  }

  /* ===========================================================
     3. Reveal on scroll
     =========================================================== */

  var reveals = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(reveals, function (el, i) {
      el.style.transitionDelay = Math.min(i % 3, 2) * 110 + 'ms';
      io.observe(el);
    });
  }

  /* ===========================================================
     4. RSVP form
     =========================================================== */

  var form     = document.getElementById('rsvpForm');
  var statusEl = document.getElementById('status');
  var submit   = document.getElementById('submit');
  var thanks   = document.getElementById('thanks');
  var attending = document.getElementById('attending');

  function say(msg, bad) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle('form__status--bad', !!bad);
    statusEl.hidden = false;
  }

  /* Hide the "which events / dietary / party names" fields for
     anyone who has said they can't make it. */
  function syncConditional() {
    var coming = attending && attending.value === 'Joyfully accepts';
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-when="attending"]'),
      function (el) { el.hidden = !coming; }
    );
  }

  if (attending) {
    attending.addEventListener('change', syncConditional);
    syncConditional();
  }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      if (!form.checkValidity()) {
        var bad = form.querySelector(':invalid');
        if (bad) bad.focus();
        say('Please fill in your name, email and whether you can join us.', true);
        return;
      }

      if (!CONFIG.RSVP_ENDPOINT) {
        say('The RSVP form is not connected yet. Please email ' +
            CONFIG.CONTACT_EMAIL + ' and we will add you by hand.', true);
        return;
      }

      var fd = new FormData(form);
      var events = fd.getAll('events');

      var payload = {
        name:       (fd.get('name')       || '').toString().trim(),
        email:      (fd.get('email')      || '').toString().trim(),
        phone:      (fd.get('phone')      || '').toString().trim(),
        attending:  (fd.get('attending')  || '').toString(),
        guests:     (fd.get('guests')     || '1').toString(),
        guestNames: (fd.get('guestNames') || '').toString().trim(),
        events:     events.join(', '),
        stay:       (fd.get('accommodation') || '').toString(),
        dietary:    (fd.get('dietary')    || '').toString().trim(),
        message:    (fd.get('message')    || '').toString().trim(),
        page:       window.location.href
      };

      // People who decline shouldn't carry stale party details.
      if (payload.attending !== 'Joyfully accepts') {
        payload.guests = '0';
        payload.guestNames = '';
        payload.events = '';
        payload.stay = '';
        payload.dietary = '';
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      say('Sending your reply…');

      // text/plain keeps this a CORS "simple request", so the
      // browser sends it to Apps Script without a preflight.
      fetch(CONFIG.RSVP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data || data.ok !== true) {
            throw new Error((data && data.error) || 'Unexpected response');
          }
          showThanks(payload);
        })
        .catch(function (err) {
          console.error('RSVP failed:', err);
          submit.disabled = false;
          submit.textContent = 'Send our RSVP';
          say('Something went wrong sending that. Please try again, or email ' +
              CONFIG.CONTACT_EMAIL + ' and we will add you by hand.', true);
        });
    });
  }

  function showThanks(payload) {
    var coming = payload.attending === 'Joyfully accepts';
    var first  = payload.name.split(/\s+/)[0] || 'friend';

    var hosted = payload.stay === 'Hosted by the couple';
    document.getElementById('thanksBody').textContent = coming
      ? first + ', we are so glad you can make it. ' + (hosted
          ? 'We will send your room details closer to the day.'
          : 'Let us know where you end up staying so we can plan the transfers.')
      : first + ', thank you for letting us know. You will be missed — we will ' +
        'raise a glass to you in Bali.';

    form.hidden = true;
    if (statusEl) statusEl.hidden = true;
    thanks.hidden = false;
    thanks.setAttribute('tabindex', '-1');
    thanks.focus({ preventScroll: true });
    thanks.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }

})();
