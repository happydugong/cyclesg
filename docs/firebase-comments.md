# Firebase Route Comments

This app uses Firebase Authentication anonymous sign-in plus Cloud Firestore for route comments.

## Install

```bash
pnpm add firebase
```

## Environment variables

Add the Firebase web app config to `.env.local` or GitHub Pages deployment secrets:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

The comments UI stays hidden behind a graceful unavailable state when these values are missing.

## Firebase setup

1. Create a Firebase project.
2. Add a Web app in Firebase and copy the config into the `VITE_FIREBASE_*` variables above.
3. In `Authentication`, enable the `Anonymous` sign-in provider.
4. In `Firestore Database`, create a database in production mode.
5. Deploy the app with the Firebase env vars available to your GitHub Pages build.

The frontend initializes anonymous auth on app load in [main.tsx](/Users/huishun/Desktop/cyclesg/src/main.tsx:1) through the comments service abstraction.

## Firestore data shape

Comments are stored under:

```text
routes/{routeId}/comments/{commentId}
```

Document shape:

```ts
{
  id: string
  author: string
  text: string
  createdAt: Timestamp
}
```

`id` is the Firestore document ID and is not stored as a separate field in the document body.

## Security rules

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /routes/{routeId}/comments/{commentId} {
      allow read: if true;

      allow create: if request.auth != null
        && request.auth.token.firebase.sign_in_provider == "anonymous"
        && request.resource.data.keys().hasOnly(["author", "text", "createdAt"])
        && request.resource.data.author is string
        && request.resource.data.author.size() > 0
        && request.resource.data.author.size() <= 50
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 500
        && request.resource.data.createdAt is timestamp;

      allow update, delete: if false;
    }
  }
}
```

## Suggested indexes

No composite index is required for the current query pattern. Firestore's default single-field index on `createdAt` supports `orderBy("createdAt", "desc")` for the `routes/{routeId}/comments` subcollection.

## Deployment notes for GitHub Pages

If you build through GitHub Actions, add these repository secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`

Then expose them to the Vite build step the same way the existing GA variable is handled.
