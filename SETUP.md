# Setup

Two things need to be done manually before this runs end to end: creating a Firebase
project and getting a Claude API key. Everything else is already wired up.

## 1. Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and create a new project.
2. In the project, go to **Build -> Firestore Database** and create a database (start in
   production mode, any region is fine).
3. Go to **Build -> Authentication -> Sign-in method** and enable the **Anonymous** provider.
   This is what keeps Firestore from being wide open to the internet without needing a
   login screen, since this is a single-user tool.
4. Go to **Project settings -> General**, scroll to "Your apps," and add a Web app. Copy the
   `firebaseConfig` values into `.env.local` (copy `.env.local.example` to `.env.local` first).
5. Deploy the security rules in `firestore.rules`: either paste them into
   **Firestore Database -> Rules** in the console, or run
   `npx firebase-tools deploy --only firestore:rules` if you have the Firebase CLI set up.

## 2. Claude API key

1. Get an API key from the [Anthropic console](https://console.anthropic.com/settings/keys).
2. Add it to `.env.local` as `ANTHROPIC_API_KEY`.

## 3. Run it

```
npm run dev
```

Open http://localhost:3000. It redirects to the calendar, which will be empty until you add
a project. On `/projects`, either fill in the form or click "Add starter projects" to seed
MigraineCast and Manifestation / Life Rebuild with their tone presets pre-filled from the
original spec, ready to tweak.

## First-run Firestore index note

The calendar page queries content across all projects using a Firestore collection group
query. This is intentionally written without an `orderBy` so no manual index setup is
required. If you later add filters that need `orderBy` on a collection-group query,
Firestore will throw an error in the browser console with a direct link to create the
missing index. Click it and wait about a minute for the index to build.
