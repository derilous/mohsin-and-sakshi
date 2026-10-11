/**
 * Sakshi & Mohsin — RSVP backend
 * ------------------------------------------------------------------
 * A Google Apps Script bound to a Google Sheet. It:
 *   1. appends (or updates) one row per guest,
 *   2. emails the guest a confirmation,
 *   3. emails the couple a notification.
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as:       Me
 *   Who has access:   Anyone
 * Then paste the /exec URL into assets/js/main.js (CONFIG.RSVP_ENDPOINT).
 *
 * Full walkthrough in SETUP.md.
 */

// ====================== SETTINGS =====================================

var SHEET_NAME   = 'RSVPs';
var COUPLE_EMAIL = 'mohsin.salim567@gmail.com';   // notifications land here
var REPLY_TO     = 'mohsin.salim567@gmail.com';   // guests reply here
var FROM_NAME    = 'Sakshi & Mohsin';
var SITE_URL     = '';                            // e.g. https://derilous.github.io/mohsin-and-sakshi/

var HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Attending', 'Party size',
  'Party names', 'Events', 'Accommodation', 'Dietary', 'Message', 'Updated'
];

// ====================== WEB APP ENTRY POINTS =========================

function doGet() {
  return json({ ok: true, service: 'rsvp', message: 'Ready.' });
}

function doPost(e) {
  // One writer at a time, so two simultaneous RSVPs can't collide.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, error: 'Busy, please try again.' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'No data received.' });
    }

    var d = JSON.parse(e.postData.contents);

    var name  = String(d.name  || '').trim();
    var email = String(d.email || '').trim();

    if (!name)  return json({ ok: false, error: 'Name is required.' });
    if (!isEmail(email)) return json({ ok: false, error: 'A valid email is required.' });

    var rsvp = {
      name:       name,
      email:      email,
      phone:      String(d.phone      || '').trim(),
      attending:  String(d.attending  || '').trim(),
      guests:     String(d.guests     || '').trim(),
      guestNames: String(d.guestNames || '').trim(),
      events:     String(d.events     || '').trim(),
      stay:       String(d.stay       || '').trim(),
      dietary:    String(d.dietary    || '').trim(),
      message:    String(d.message    || '').trim()
    };

    var result = saveRow(rsvp);

    // A failed email must not lose the RSVP — the row is already saved.
    try { emailGuest(rsvp); }  catch (err) { log_('guest email failed: ' + err); }
    try { emailCouple(rsvp, result.updated); } catch (err) { log_('couple email failed: ' + err); }

    return json({ ok: true, updated: result.updated });

  } catch (err) {
    log_('doPost failed: ' + err);
    return json({ ok: false, error: 'Server error.' });
  } finally {
    lock.releaseLock();
  }
}

// ====================== SHEET =======================================

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);

  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#3A5244')
      .setFontColor('#FBF8F2');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 160);  // timestamp
    sh.setColumnWidth(2, 180);  // name
    sh.setColumnWidth(3, 230);  // email
    sh.setColumnWidth(9, 170);  // accommodation
    sh.setColumnWidth(11, 320); // message
  }

  return sh;
}

/**
 * Appends a new row, or updates the existing row for this email so a
 * guest who changes their mind doesn't appear twice.
 */
function saveRow(r) {
  var sh   = sheet_();
  var now  = new Date();
  var row  = [
    now, r.name, r.email, r.phone, r.attending, r.guests,
    r.guestNames, r.events, r.stay, r.dietary, r.message, ''
  ];

  var last = sh.getLastRow();
  if (last > 1) {
    var emails = sh.getRange(2, 3, last - 1, 1).getValues();
    var key = r.email.toLowerCase();
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).trim().toLowerCase() === key) {
        var target = i + 2;
        // keep the original timestamp, stamp the update instead
        row[0] = sh.getRange(target, 1).getValue() || now;
        row[HEADERS.length - 1] = now;
        sh.getRange(target, 1, 1, HEADERS.length).setValues([row]);
        return { updated: true, row: target };
      }
    }
  }

  sh.appendRow(row);
  return { updated: false, row: sh.getLastRow() };
}

// ====================== EMAIL =======================================

function emailGuest(r) {
  var coming = r.attending === 'Joyfully accepts';
  var first  = r.name.split(/\s+/)[0];

  var intro = coming
    ? 'We are so glad you can join us. Your RSVP is confirmed and your name is on the list.'
    : 'Thank you for letting us know. You will be missed — we will raise a glass to you in Bali.';

  var rows = [
    ['Name', r.name],
    ['Response', r.attending]
  ];
  if (coming) {
    if (r.guests)     rows.push(['Party size', r.guests]);
    if (r.guestNames) rows.push(['Party', r.guestNames]);
    if (r.events)     rows.push(['Attending', r.events]);
    if (r.stay)       rows.push(['Stay', r.stay]);
    if (r.dietary)    rows.push(['Dietary', r.dietary]);
  }

  var schedule = coming ? [
    ['Haldi',     'Friday 19 March 2027',   '3:30 pm &ndash; 6:30 pm'],
    ['Nikah',     'Saturday 20 March 2027', '4:00 pm &ndash; 6:00 pm'],
    ['Reception', 'Saturday 20 March 2027', '7:00 pm &ndash; 10:00 pm']
  ] : [];

  MailApp.sendEmail({
    to: r.email,
    replyTo: REPLY_TO,
    name: FROM_NAME,
    subject: coming
      ? 'Your RSVP is confirmed — Sakshi & Mohsin, Bali 2027'
      : 'We received your RSVP — Sakshi & Mohsin',
    htmlBody: guestHtml_(first, intro, rows, schedule, coming),
    body: guestText_(first, intro, rows, coming)
  });
}

function emailCouple(r, updated) {
  var lines = [
    (updated ? 'UPDATED RSVP' : 'New RSVP'),
    '',
    'Name:       ' + r.name,
    'Email:      ' + r.email,
    'Phone:      ' + (r.phone || '—'),
    'Response:   ' + r.attending,
    'Party size: ' + (r.guests || '—'),
    'Party:      ' + (r.guestNames || '—'),
    'Events:     ' + (r.events || '—'),
    'Stay:       ' + (r.stay || '—'),
    'Dietary:    ' + (r.dietary || '—'),
    '',
    'Message:',
    (r.message || '—')
  ];

  MailApp.sendEmail({
    to: COUPLE_EMAIL,
    replyTo: r.email,
    name: 'Wedding RSVPs',
    subject: (updated ? '[updated] ' : '') + 'RSVP: ' + r.name + ' — ' + r.attending,
    body: lines.join('\n')
  });
}

// ====================== EMAIL TEMPLATES =============================

function guestHtml_(first, intro, rows, schedule, coming) {
  var IVORY = '#FBF8F2', CREAM = '#F1E7D8', PALM = '#2C5F63',
      GOLD  = '#B49055', INK   = '#273634', MUTED = '#677976';

  var detailRows = rows.map(function (p) {
    return '<tr>' +
      '<td style="padding:7px 16px 7px 0;color:' + MUTED + ';font-size:13px;' +
      'letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap;' +
      'vertical-align:top">' + esc_(p[0]) + '</td>' +
      '<td style="padding:7px 0;color:' + INK + ';font-size:16px">' +
      esc_(p[1]) + '</td></tr>';
  }).join('');

  var scheduleHtml = '';
  if (schedule.length) {
    scheduleHtml =
      '<div style="height:1px;background:' + GOLD + ';opacity:.3;margin:32px 0"></div>' +
      '<p style="margin:0 0 16px;color:' + GOLD + ';font-size:12px;letter-spacing:3px;' +
      'text-transform:uppercase">The celebrations</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">' +
      schedule.map(function (ev) {
        return '<tr><td style="padding:9px 0;border-bottom:1px solid ' + CREAM + '">' +
          '<div style="font-size:21px;color:' + PALM + '">' + ev[0] + '</div>' +
          '<div style="font-size:14px;color:' + MUTED + '">' +
          ev[1] + ' &middot; ' + ev[2] + '</div></td></tr>';
      }).join('') +
      '</table>';
  }

  var siteButton = SITE_URL
    ? '<p style="margin:34px 0 0"><a href="' + SITE_URL + '" ' +
      'style="display:inline-block;padding:14px 34px;background:' + PALM + ';' +
      'color:' + IVORY + ';text-decoration:none;font-size:12px;letter-spacing:3px;' +
      'text-transform:uppercase">View the invitation</a></p>'
    : '';

  return '' +
  '<!doctype html><html><body style="margin:0;padding:0;background:' + CREAM + '">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
  'style="background:' + CREAM + ';padding:32px 16px">' +
  '<tr><td align="center">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
  'style="max-width:580px;background:' + IVORY + ';">' +

  // header
  '<tr><td style="background:' + PALM + ';padding:40px 32px;text-align:center">' +
  '<div style="color:' + GOLD + ';font-size:11px;letter-spacing:4px;' +
  'text-transform:uppercase;margin-bottom:14px">You are invited</div>' +
  '<div style="color:' + IVORY + ';font-size:36px;font-family:Georgia,serif">' +
  'Sakshi &amp; Mohsin</div>' +
  '<div style="color:' + IVORY + ';opacity:.75;font-size:13px;letter-spacing:2px;' +
  'margin-top:12px">19 &amp; 20 MARCH 2027 &middot; NUSA DUA, BALI</div>' +
  '</td></tr>' +

  // body
  '<tr><td style="padding:40px 32px;font-family:Georgia,serif;color:' + INK + ';' +
  'font-size:16px;line-height:1.7">' +
  '<p style="margin:0 0 20px;font-size:20px">Dear ' + esc_(first) + ',</p>' +
  '<p style="margin:0 0 28px;color:' + MUTED + '">' + esc_(intro) + '</p>' +

  '<p style="margin:0 0 10px;color:' + GOLD + ';font-size:12px;letter-spacing:3px;' +
  'text-transform:uppercase">Your reply</p>' +
  '<table role="presentation" cellpadding="0" cellspacing="0">' + detailRows + '</table>' +

  scheduleHtml +

  (coming
    ? '<div style="height:1px;background:' + GOLD + ';opacity:.3;margin:32px 0"></div>' +
      '<p style="margin:0 0 14px;color:' + MUTED + ';font-size:15px">' +
      'Everything takes place at <strong style="color:' + INK + '">The Westin Resort ' +
      'Nusa Dua, Bali</strong>. Please plan to arrive on the <strong style="color:' +
      INK + '">morning of Friday 19 March</strong> &mdash; that is when your ' +
      'accommodation begins.</p>' +
      '<p style="margin:0;color:' + MUTED + ';font-size:15px">' +
      'We have booked and are covering your stay, and will send your own room ' +
      'details closer to the date. If anything changes, just reply to this email.</p>'
    : '') +

  siteButton +

  '<p style="margin:34px 0 0;color:' + MUTED + ';font-size:15px">' +
  'With love,<br><span style="font-size:19px;color:' + PALM + '">Sakshi &amp; Mohsin</span></p>' +
  '</td></tr>' +

  // footer
  '<tr><td style="background:' + CREAM + ';padding:22px 32px;text-align:center;' +
  'color:' + MUTED + ';font-family:Georgia,serif;font-size:12px;letter-spacing:1px">' +
  'The Westin Resort Nusa Dua &middot; Bali, Indonesia' +
  '</td></tr>' +

  '</table></td></tr></table></body></html>';
}

function guestText_(first, intro, rows, coming) {
  var out = ['Dear ' + first + ',', '', intro, '', 'YOUR REPLY'];
  rows.forEach(function (p) { out.push('  ' + p[0] + ': ' + p[1]); });

  if (coming) {
    out.push('', 'THE CELEBRATIONS',
      '  Haldi      Friday 19 March 2027, 3:30 pm - 6:30 pm  (please wear yellow)',
      '  Nikah      Saturday 20 March 2027, 4:00 pm - 6:00 pm',
      '  Reception  Saturday 20 March 2027, 7:00 pm - 10:00 pm',
      '', 'All at The Westin Resort Nusa Dua, Bali.',
      '', 'Please arrive on the morning of Friday 19 March - that is when your',
      'accommodation begins. We have booked and are covering your stay.');
  }

  out.push('', 'With love,', 'Sakshi & Mohsin');
  if (SITE_URL) out.push('', SITE_URL);
  return out.join('\n');
}

// ====================== HELPERS =====================================

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function esc_(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function log_(msg) {
  try { console.error(msg); } catch (e) {}
}

// ====================== TEST HARNESS ================================

/** Run this once from the editor to check the Sheet + emails work. */
function testRsvp() {
  var res = doPost({
    postData: {
      contents: JSON.stringify({
        name: 'Test Guest',
        email: COUPLE_EMAIL,
        phone: '+91 00000 00000',
        attending: 'Joyfully accepts',
        guests: '2',
        guestNames: 'Test Guest, Plus One',
        events: 'Haldi — Fri 19 Mar, Nikah — Sat 20 Mar, Reception — Sat 20 Mar',
        stay: 'Hosted by the couple',
        dietary: 'Vegetarian',
        message: 'This is a test row. Delete it from the sheet when you are done.'
      })
    }
  });
  Logger.log(res.getContent());
}
