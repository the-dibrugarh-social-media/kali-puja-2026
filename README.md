# Kali Puja · Dibrugarh 2026

A fresh React festival voting experience with a dedicated Google Apps Script backend. The visible brand line reads “The_Dibrugarh presents.” The scroller keeps a large “Cast your vote” callout visible while cycling through three Kali Puja facts. The intro includes a link to the [Incredible India Kali Puja guide](https://www.incredibleindia.gov.in/en/festivals-and-events/kali-puja). The Dibrugarh Instagram link is optional and is not part of voting. The supplied logo is used in the header, footer, favicon, and share metadata. The hero uses a high-resolution Unsplash image of Maa Kali from Amadpur, and the introduction uses a diya photograph. Both have photographer credits in the page footer. These are mood photographs, not Dibrugarh pandal entries.

## Run the frontend locally

On macOS, double-click `start-local.command`. The first run installs the project dependencies, then opens the site at `http://localhost:5173`.

Or run these commands from this folder:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Do not open `index.html` directly as a `file://` URL; React module assets require the local web server. To connect real pandal search and voting, copy `.env.example` to `.env.local` and set `VITE_APPS_SCRIPT_URL` to the deployed Apps Script web app URL. Phone voting does not depend on Google configuration. `VITE_GOOGLE_CLIENT_ID` is optional because the supplied client ID is already the default.

Without the Apps Script URL, the UI intentionally shows an unconnected state and does not show fake pandals or sample vote counts.

## Deploy the frontend to Cloudflare Pages

Cloudflare Pages hosts the frontend only; the API/backend continues running as an Apps Script Web App.

1. Push the `kali-puja-2026` project folder to a GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Import an existing Git repository**, then choose the repository.
3. Set the project root directory to `outputs/kali-puja-2026` if the repository contains a parent folder. Use build command `npm run build` and output directory `dist`.
4. In Pages **Settings → Environment variables**, add `VITE_APPS_SCRIPT_URL` with the deployed Apps Script Web App URL. `VITE_GOOGLE_CLIENT_ID` is optional because the existing client ID is already the default.
5. Make sure `VITE_APPS_SCRIPT_URL` is set for both Production and Preview. Deploy. Cloudflare builds and serves the React site; public pandal and results reads go to Apps Script, while vote submissions pass through the Pages Function at `/api/vote` so it can attach Cloudflare's visitor IP header.

The vote review screen explains what is collected. Submissions include browser/device metadata and a SHA-256 device signal. Precise location is requested only when a voter checks the optional location box; denying or timing out location does not block a vote. On Cloudflare Pages, `/api/vote` attaches the visitor IP from `CF-Connecting-IP`; local Vite runs send the vote directly to Apps Script and therefore do not include a server-observed IP. The IP header is supplied by Cloudflare, not accepted from a browser-submitted field. Deploy `backend/Code.gs` as a new Apps Script version after backend changes. These fields apply to new votes; existing rows are not backfilled.

The Apps Script Web App must be deployed and accessible before the live pandal search and voting will work. The web app URL is a public configuration value; never put `ADMIN_KEY` in the frontend environment.

The organizer console is available only by navigating directly to `/admin`; there is no public navigation link. It sends the key entered by an organizer to the Apps Script admin actions over HTTPS and keeps it in tab memory only. The Apps Script deployment must include the current `backend/Code.gs`, including the `getAdminPandals` action. If `/admin` shows “Unknown admin action,” open the Apps Script project, replace its code with `backend/Code.gs`, save, then choose **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the same web app deployment URL. The Admin console can add and deactivate entries and create two clearly labeled test pandals; those test entries appear in the live public list until deactivated, and any test votes remain in the Votes sheet until removed there.

## Deploy the Apps Script backend

1. Create a new Apps Script project bound to the spreadsheet that should hold the event data.
2. Paste `backend/Code.gs` into the project. This is a dedicated Kali Puja deployment; it does not replace or edit a Durga Puja deployment.
3. Add Script Property `ADMIN_KEY` (a long random secret). The Google OAuth client ID from the supplied backend is already the frontend and backend default; `VITE_GOOGLE_CLIENT_ID` and Script Property `GOOGLE_CLIENT_ID` can override it if needed. Optionally set `KALI_VOTING_CLOSES_AT` to an ISO-8601 date/time; leave it unset while no closing time is configured.
4. Run `initializeKaliPuja2026()` once and authorize the requested spreadsheet, Drive, and URL Fetch scopes.
5. Deploy as a Web App. Use an execution identity with access to the spreadsheet, and set access to anyone if public browsing and voting are intended.
6. Add Kali Puja entries using the authorized `addPandal` admin action with `eventId` implicitly set to `kali-puja-2026`. The public search shows only active Kali entries. No fake entries are created.

The backend uses the `Votes` and `Pandals` sheets. It appends `Event_ID` and `Category_ID` columns to Votes and `Event_ID` to Pandals when needed. Older rows with no event marker are retained and classified as legacy Durga Puja data, so they do not appear in Kali results or count against Kali voters. Kali submissions require a valid category, active Kali pandal, voting-rules acceptance, and either a verified Google ID token or a normalized Indian mobile number. Phone input does not verify ownership and no OTP is sent.

## Vote endpoint payload

```json
{
  "eventId": "kali-puja-2026",
  "categoryId": "best_pandal",
  "pandalId": "12",
  "phone": "9876543210",
  "rulesAccepted": true
}
```

Use either `phone` or `idToken`; never send both. The client does not send a follow token, `followConfirmed`, Instagram handle, or any Instagram eligibility signal. The backend does not implement a Kali Puja follow gate. Atomic duplicate checks are scoped to the verified identity, event, and category, allowing a voter to vote in each of the three categories.

## Apps Script public requests

- `GET ?pandals=1&eventId=kali-puja-2026` — active pandals for search.
- `GET ?results=1&eventId=kali-puja-2026` — independent category counts; no voter records.
- `POST` with `action: "getAdminVotes"`, `key`, and optional `eventId` — private event vote records for authorized admin review.
- `POST` with `action: "addPandal"`, `key`, `name`, `area`, and optional image fields — add an entry to this event.
- `POST` with `action: "setPandalActive"`, `key`, `id`, and `active` — activate or deactivate this event's entry.
- `POST` with `action: "getAdminPandals"`, `key`, and optional `eventId` — list this event's entries, including inactive ones, for the Admin console.

Do not put `ADMIN_KEY` in the frontend. The image upload action stores photos in a Drive folder and enables link viewing so they can be used as public pandal images.
