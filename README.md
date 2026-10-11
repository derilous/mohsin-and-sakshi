# Sakshi & Mohsin

The wedding invitation for **Sakshi Arora** and **Mohsin Habiya** —
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
   - the villa name/location for the Arora guests, if you want it named
   - whether airport transfers are arranged, and from when
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

**The artwork is all generated geometry**, not photographs. Palm fronds are a
stem curve with leaflets placed along it under a sine envelope; frangipani are
five asymmetric bezier petals in a pinwheel; the surf between sections is three
phase-shifted sine bands. Each file is a couple of KB and stays sharp at any
size. Fronds are positioned by their stalk, not their bounding box, so rotating
one swings it from where it is rooted.

**Photographs.** *Your Stay* sits on a photo that swaps by viewport: the
portrait Nusa Penida shot on phones, the landscape Ulun Danu shot from 760px
up, so neither is cropped to nothing. Only the matching one is downloaded. It
drifts on scroll — `background-attachment: fixed` is the one-line version, but
iOS Safari ignores it, so the drift is a transform on a layer 28% taller than
the section. The text sits on a frosted panel; browsers without
`backdrop-filter` get a solid one instead.

**Caching.** The CSS and JS are linked with `?v=3`. If you change either file
and the old version sticks, bump that number in `index.html`.

**Motion.** Everything animated respects `prefers-reduced-motion`.
