# RSVP backend — setup

Roughly 10 minutes, once. Everything here is free: no server, no database bill,
nothing that expires or goes to sleep.

**What you end up with:** every RSVP lands as a row in a Google Sheet you both
own. The guest gets a confirmation email instantly. You get a notification email.

---

## 1. Make the Sheet

1. Go to <https://sheets.new> and name it **Mohsin & Sakshi — RSVPs**.
2. You don't need to add any columns. The script creates a tab called `RSVPs`
   with proper headers the first time someone replies.

## 2. Add the script

1. In that Sheet: **Extensions → Apps Script**.
2. Delete the placeholder `myFunction` code.
3. Paste in the entire contents of [`Code.gs`](Code.gs).
4. At the top of the file, check these two settings:

   ```js
   var COUPLE_EMAIL = 'mohsin.salim567@gmail.com';   // where notifications go
   var SITE_URL     = '';                            // fill in after step 4
   ```

5. Click the **save** icon.

## 3. Deploy it as a web app

1. **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** `RSVP endpoint`
   - **Execute as:** `Me (your@gmail.com)`
   - **Who has access:** `Anyone`  ← must be *Anyone*, not "Anyone with Google account"
4. **Deploy**. Google will ask you to authorise it — click through
   *Advanced → Go to (unsafe)* if it warns you; it is your own script.
5. Copy the **Web app URL**. It looks like:

   ```
   https://script.google.com/macros/s/AKfycb..................../exec
   ```

## 4. Connect the site

Open [`assets/js/main.js`](../assets/js/main.js) and paste the URL in:

```js
var CONFIG = {
  RSVP_ENDPOINT: 'https://script.google.com/macros/s/AKfyc.../exec',
  ...
};
```

Commit and push. GitHub Pages redeploys in about a minute.

Then go back to the Apps Script editor, set `SITE_URL` to your live URL, save,
and **Deploy → Manage deployments → edit (pencil) → Version: New version →
Deploy**. That makes the confirmation emails link back to the invitation.

## 5. Test it

In the Apps Script editor, pick `testRsvp` from the function dropdown and press
**Run**. You should get:

- a new row in the `RSVPs` tab,
- a confirmation email in your inbox,
- a notification email too.

Delete the test row when you're happy. Then do it once more for real from the
live site, on a phone.

---

## Living with it

**Where are my RSVPs?** The `RSVPs` tab of the Sheet. Sort, filter, add your own
columns to the right — the script only ever writes columns A–K, so anything you
add past K is safe.

**Someone replied twice.** The script matches on email address and *updates*
their existing row rather than adding a second one. The `Updated` column shows
when they last changed it.

**Can I change the email wording?** Yes — `emailGuest` and `guestHtml_` in
`Code.gs`. Re-deploy a new version afterwards (step 4) or nothing changes.

**Limits.** A consumer Gmail account can send 100 emails a day through Apps
Script. Unless 100 people RSVP in a single day, you will not notice. If you have
a Workspace account it is 1,500.

**Deploying changes.** Editing `Code.gs` does *not* update the live endpoint.
You must **Deploy → Manage deployments → pencil → Version: New version →
Deploy** each time. The URL stays the same.

**Nothing is arriving.** Open the browser console on the site and submit again.
A CORS error almost always means "Who has access" is not set to **Anyone**, or
you pasted the `/dev` URL instead of the `/exec` one.
