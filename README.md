# UF AIAA Experience Map

A free-to-host website that replaces the chapter's Google My Maps alumni map.

- **`index.html`** — the public map. Anyone can search, click pins, and submit their own experience for review.
- **`admin.html`** — officer sign-in. Approve or reject submissions, add/edit/delete entries, import the old map, export a CSV backup, and manage which officers have access.
- **Data** lives in Firebase (Firestore + Authentication). Free tier is far beyond what a chapter map needs, and there's no server to maintain or renew.
- **Hosting** is GitHub Pages (also free). Setup is about 30 minutes, once. After that, nobody touches code — updates happen in the admin page.

Until Firebase is connected, both pages run in **demo mode** with fictional sample data so you can preview the design.

---

## 1. Put the site on GitHub Pages

1. Create a GitHub account for the chapter if there isn't one (e.g. `uf-aiaa`), so the site doesn't disappear when you graduate.
2. Create a new **public** repository, e.g. `experience-map`.
3. Upload every file in this folder (keep the `assets/` folder structure). Drag-and-drop in the GitHub web UI works.
4. Repo **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
5. After a minute the site is live at `https://<account>.github.io/experience-map/`. Add that link to the chapter website and Slack/Discord.

## 2. Create the Firebase project (free)

1. Go to <https://console.firebase.google.com> and sign in with a chapter Google account (the same one that owns the My Maps map is fine).
2. **Add project** → name it `uf-aiaa-experience-map`. Google Analytics can be off.
3. In the project, click the **web icon `</>`** ("Add Firebase to your web app"). Nickname it anything; don't tick Firebase Hosting. Click Register.
4. You'll see a `firebaseConfig = { apiKey: "...", ... }` block. Copy those six values into **`firebase-config.js`** in this folder and re-upload that file to GitHub.

## 3. Turn on the database

1. Left menu → **Build → Firestore Database → Create database**.
2. Location: `nam5 (United States)` or anything US. Start in **production mode**.
3. Open the **Rules** tab, delete what's there, paste the entire contents of **`firestore.rules`** from this folder, and click **Publish**.

## 4. Turn on officer sign-in

1. Left menu → **Build → Authentication → Get started**.
2. Sign-in method → **Email/Password** → Enable → Save.
3. Authentication → **Settings → Authorized domains** → Add domain → your GitHub Pages host, e.g. `uf-aiaa.github.io`.

## 5. Make yourself the first officer

The admin page only lets emails on the officer list make changes. The first one has to be added by hand:

1. Firestore Database → **Data** tab → **Start collection** → Collection ID: `admins` → Next.
2. Document ID: **your email, all lowercase** (e.g. `bjacobson@ufl.edu`). Add one field: `addedBy` (string) = `setup`. Save.
3. Open `https://<account>.github.io/experience-map/admin.html`, click **"First time here? Create your account"**, and sign up with that same email.

From now on, adding the next chair is done inside the admin page under **Officers** — no console needed.

## 6. Move the existing map over

1. Open the Google My Maps map as an editor → the **⋮** menu next to the map title → **Export to KML/KMZ** → choose the alumni layer → tick **"Export as KML instead of KMZ"** → Download.
2. In `admin.html` → **Import & export** → drop the `.kml` file in. Pins keep their exact positions from the old map.
3. Click **Preview**, check the first rows look right, click **Import**.

If you'd rather go through a spreadsheet: open the layer's data table in My Maps, copy it into a Google Sheet, **File → Download → CSV**, and drop that in instead. Cities are geocoded automatically at about one per second (a 150-row import takes 2–3 minutes; you can leave the tab open). `sample-import.csv` shows the expected columns.

## 7. Add the chapter logo

`assets/logo.svg` is a placeholder. Replace it with the official chapter logo:

- If you have an SVG, overwrite `assets/logo.svg` and you're done.
- If you have a PNG, save it as `assets/logo.png`, then change `assets/logo.svg` to `assets/logo.png` in the three `<img>` tags (header and footer of `index.html`, header of `admin.html`).

It displays 44 px tall on a UF-blue bar, so a white or light version of the logo reads best.

---

## Day-to-day (what the Experience Tracking Chair actually does)

- Someone fills out **Add your experience** on the public page → it lands in the admin **Pending** tab.
- You click **Approve** (or **Edit, then approve** to fix a typo). It's on the map immediately, pin placed automatically from the city and state.
- Wrong pin location? Alumni tab → Edit → clear Latitude/Longitude and save to re-locate, or type coordinates directly.
- Once a semester, **Import & export → Download CSV** and drop it in the chapter Drive as a backup.
- Handing off: **Officers → Add officer** with the new chair's email. They create their account on the sign-in page. Then remove yourself.

## Costs and limits

Everything here is on free tiers with generous headroom for a chapter-sized map:

- GitHub Pages: free for public repos.
- Firebase Spark plan: 50k document reads/day, 20k writes/day, 1 GB storage. Each visit to the map reads the alumni collection once, so a 300-entry map supports ~150 visits a day before you'd notice, and it just degrades until midnight rather than billing you (Spark can't be charged).
- Map tiles: CARTO's free basemap. Geocoding: OpenStreetMap Nominatim (free, rate-limited to ~1/sec, which the import respects).

## Privacy note

Alumni email addresses on the map are readable by anyone with the link (that's the point, but it's also scrapeable). The public form makes email optional and suggests LinkedIn instead; when approving, you can blank out an email if someone seems to have added it by habit. If the chapter later wants the map members-only, the simplest route is to require sign-in to view — ask whoever maintains this to add `allow read: if request.auth != null;` on `alumni` and put a sign-in button on the public page.

## Files

```
index.html          public map + submission form
admin.html          officer admin (login, approvals, editing, import/export, officers)
firebase-config.js  paste your Firebase config here
firestore.rules     paste into Firebase console > Firestore > Rules
assets/site.css     shared styles (UF blue #0021A5 / UF orange #FA4616)
assets/data.js      data layer — Firestore calls, geocoding, demo fallback
assets/logo.svg     placeholder logo — replace with the chapter's
sample-import.csv   example of the import format
```
