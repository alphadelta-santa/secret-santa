# 🎅 Secret Santa

A Christmas Secret Santa site for GitHub Pages: Google sign-in, name claiming, wishlists, secret random draw, "I bought the gift" button, countdown, and email reminders.

**Preview first:** open the site before setting anything up and it runs in preview mode with fake data (group code `jingle`).

## How it works

| Piece | What it does |
|---|---|
| GitHub Pages | Hosts the website (free) |
| Firebase Auth | "Sign in with Google" |
| Firestore + `firestore.rules` | Stores names, wishlists, pairs. Rules lock everything down |
| GitHub Actions | Does the secret draw on a server and sends emails (free) |

## Setup (about 20 minutes)

### 1. Firebase (free Spark plan, no card)
1. Go to https://console.firebase.google.com and create a project.
2. **Build > Authentication > Get started > Google > Enable.**
3. **Authentication > Settings > Authorized domains > Add** `YOUR-GITHUB-USERNAME.github.io`
4. **Build > Firestore Database > Create database** (production mode, region `us-east1`).
5. **Firestore > Rules:** paste all of `firestore.rules`, replace `your.email@gmail.com` with your Google email, **Publish**.
6. **Project settings (gear) > General > Your apps > Web (`</>`)**: register an app, copy the config values into `js/firebase-config.js`. Put your email in `ADMIN_EMAILS` too.

### 2. GitHub Pages
1. Create a **public** repo and upload every file in this folder (keep the folder structure, including `.github`).
2. **Settings > Pages > Source: Deploy from a branch > main / (root) > Save.**
3. Your site will be at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

### 3. First login (you, the organizer)
1. Set the first group code in the Firebase console: **Firestore > Start collection** `private` > document ID `settings` > field `joinCode` (string) = your code, e.g. `candycane42`.
2. Open the site, sign in with your admin Google account, and claim your name with that code.
3. Use the **Admin** tab to set event details (date can stay TBD). You can change the code there anytime.
4. Send the site link and the group code in the group chat.

### 4. Emails + the draw (GitHub Actions secrets)
1. **Firebase key:** Project settings > Service accounts > **Generate new private key**. Downloads a JSON file. **Never upload this file to the repo.**
2. **Gmail app password:** turn on 2-Step Verification on the Gmail you'll send from, then go to https://myaccount.google.com/apppasswords and create one.
3. In your GitHub repo: **Settings > Secrets and variables > Actions > New repository secret**, add:
   - `FIREBASE_SERVICE_ACCOUNT` = paste the entire JSON file contents
   - `GMAIL_USER` = the Gmail address
   - `GMAIL_APP_PASSWORD` = the 16-character app password
   - `SITE_URL` = your site link
   - `ROSTER_EMAILS` (optional) = emails for people who haven't joined, see Reminders below

### 5. Draw names
Once everyone has joined: **Actions > Draw names > Run workflow**, type `DRAW`. Everyone gets an email. Pairs are written straight to the database; they are never printed or shown to you.

### Reminders (wishlists due Dec 1, budget $35)
`Send reminders` runs every day around 10am ET and decides what to send:
- **Empty wishlists** (no items and no interests): emailed Mondays and Thursdays, then **every day Nov 28 to Dec 1**, with a "last call" on Dec 1. Late people keep getting Mon/Thu nudges until the draw.
- **After the draw:** people who haven't clicked "I bought the gift" get Mon/Thu reminders.
- **People who never joined** have no email on file. To nag them too, add a GitHub secret `ROSTER_EMAILS` with their emails as JSON, e.g. `{"Anjali":"anjali@gmail.com","Arun":"arun@gmail.com"}`. Anyone who has joined is skipped from this list automatically.
- Run it by hand anytime (Actions > Send reminders > Run workflow) with an optional custom message; manual runs send right away.

The budget ($35) and wishlist deadline (Dec 1) are defaults in `js/firebase-config.js` and the workflow files. You can change both in the site's Admin tab.

## Security
- Data is encrypted in transit (HTTPS) and at rest (Firestore default).
- Each Google account can claim exactly one name, each name only once, and only with the group code.
- You can only read **your own** assignment. Not even the admin can read the pairs.
- Only you can edit your wishlist and your "bought" flag. Only the admin can edit event details or release a name.
- Emails are only visible to the admin and never printed in Action logs.
- The Firebase config in `js/firebase-config.js` is supposed to be public; the rules are what protect the data.

## Changing the people
Edit `names.json` **and** the `names()` list in `firestore.rules` (then republish the rules).

## The 3D intro
The planet intro is `src/intro3d.src.js` (three.js). The site loads the bundled file `js/intro3d.js`. If you edit the source, rebuild it with:
```
npm i three esbuild
npx esbuild src/intro3d.src.js --bundle --minify --format=esm --outfile=js/intro3d.js
```
If a browser can't do 3D, the intro is skipped automatically.
