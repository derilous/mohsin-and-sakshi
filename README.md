# Mohsin & Sakshi

The wedding invitation for **Mohsin Habiya** and **Sakshi Arora** —
19 & 20 March 2027, The Westin Resort Nusa Dua, Bali.

A single static page. No framework, no build step, no server. It is three
files plus a few SVGs, and it costs nothing to run.

```
index.html              the whole invitation
assets/css/style.css    all styling
assets/js/main.js       gate, countdown, scroll reveals, RSVP  ← endpoint goes here
assets/img/*.svg        palm fronds, drawn as vectors
apps-script/Code.gs     the RSVP backend (Google Apps Script)
apps-script/SETUP.md    how to wire the backend up
```

## Running it locally

Any static file server will do:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Before it goes live

1. **Wire up RSVPs** — follow [`apps-script/SETUP.md`](apps-script/SETUP.md).
   Until you paste the endpoint into `assets/js/main.js`, the form politely
   tells guests to email instead, so the page is safe to share either way.
2. **Fill in the gaps** — search the HTML for these and replace with real
   details when you have them:
   - room block / booking link and rates (the *Your Stay* section)
   - the dress-code wording, if "tropical formal" isn't what you meant
   - the RSVP deadline, currently **31 October 2026**
3. **Add a social preview image** at `assets/img/og.png` (1200×630). Until it
   exists, links shared on WhatsApp show no picture.

## Deploying

Pushing to `main` publishes automatically via GitHub Pages.

To put it on your own domain later: add a `CNAME` file containing the domain,
point a `CNAME` DNS record at `<user>.github.io`, then turn on
*Enforce HTTPS* in **Settings → Pages**.

## Notes on how it works

**The gate.** Two panels that part when you press the wax seal. Anyone arriving
on a deep link (`/#rsvp`) skips it, so you can send guests straight to the form.

**The countdown** counts to `2027-03-19T15:30:00+08:00` — when the Haldi starts,
in Bali time. It is set in one place, `CONFIG.WEDDING_ISO` in `main.js`.

**The palm fronds** are generated geometry, not photographs: a stem curve with
leaflets placed along it under a sine envelope. Each file is about 2 KB and
stays sharp at any size. They are positioned by their stalk, not their bounding
box, so rotating one swings it from where it is rooted.

**Caching.** The CSS and JS are linked with `?v=1`. If you change either file
and the old version sticks, bump that number in `index.html`.

**Motion.** Everything animated respects `prefers-reduced-motion`.
