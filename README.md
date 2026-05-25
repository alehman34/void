# void

A place to write thoughts without the pressure of rereading them.

Write freely, then let it go. If you want to revisit something, ask — Claude will surface what's relevant from what you've written. Your entries are stored in your own Google Drive.

## setup

1. **Google OAuth** — create a project in [Google Cloud Console](https://console.cloud.google.com), enable the Drive API, and create OAuth 2.0 credentials. Add your deployment URL as an authorized redirect URI.

2. **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com).

3. Copy `.env.local.example` to `.env.local` and fill in the values:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=        # any random string
NEXTAUTH_URL=           # your deployment URL (http://localhost:3000 for local)
ANTHROPIC_API_KEY=
```

4. Install and run:

```
npm install
npm run dev
```

## deploy

Works out of the box on [Vercel](https://vercel.com). Add the env vars in the project settings and deploy from this repo.
