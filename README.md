# SIF Intelligence

Serious Injury & Fatality Intelligence

**Tagline:** Detect risk before it becomes fatal.

SIF is a prototype safety intelligence dashboard for industrial and oilfield operations. It demonstrates worker voice reporting, safety record matching, explainable risk analysis, worker alerts, supervisor escalation and operations monitoring.

## 1. Required Software

Install these on the team member's computer:

1. **Node.js 20.19+ or 22.12+**
   - Download from: https://nodejs.org/
   - During installation, keep the default options selected.
   - Restart VS Code after installation.

2. **VS Code**
   - Download from: https://code.visualstudio.com/
   - Open the complete `SIF` project folder, not only one file.

3. **Google Chrome or Microsoft Edge**
   - Recommended for the voice-report demo because browser microphone access works best there.

No Python, database server, pnpm or separate backend is required for this prototype.

## 2. Project Files

The important files are:

- `src/App.tsx` - Main SIF application and interaction logic
- `src/index.css` - Dashboard styling
- `src/main.tsx` - React entry point
- `images/` - Provided field, worker and PPE images
- `sif-system-workflow.svg` - PPT workflow diagram
- `sif-architecture.svg` - PPT architecture diagram
- `sif-diagram-notes.txt` - Explanation for both diagrams
- `package.json` - Project dependencies and commands

## 3. First-Time Setup

Open the VS Code terminal:

```powershell
cd C:\Users\Admin\Desktop\SIF
npm install
```

Wait until the installation completes successfully. This downloads React, Vite, Tailwind CSS, TypeScript and the other project dependencies into `node_modules`.

## 4. Run the Prototype

From the same terminal, run:

```powershell
npm run dev
```

The terminal will show a local URL, normally:

```text
http://localhost:8443/
```

Open that URL in Chrome or Edge.

Keep the terminal running while presenting. To stop the server, press `Ctrl + C` in the terminal.

## 5. Recommended Demo Flow

1. Open the app on the **Incident Analyzer** tab.
2. Show the worker incident, risk score, factor breakdown and recommended action.
3. Open **Worker Device**.
4. Click **HOLD TO REPORT** or say the wake word concept: `AURA`.
5. Allow microphone permission if Chrome or Edge asks for it.
6. Speak a short report in Hindi, Assamese or English.
7. The prototype shows a transcript and matches the report with previous safety records.
8. Show the detected hazard, risk score and exact worker action.
9. Open **Operations Desk**.
10. Show the escalation owners:
    - Suresh - Safety Officer
    - Divya - Site Supervisor
    - Darshna - Field Relay
    - Saniya - Worker Relay
11. Open **Network Overview** to show field evidence, Toolbox Talk, zone status, training compliance, site heatmap and incident improvement metrics.
12. Use **Pattern Alerts** to show repeated safety patterns.

## 6. Voice Demo Notes

The prototype uses the browser Speech Recognition API when it is available. If microphone access or Speech Recognition is unavailable, the demo automatically loads a prepared safety scenario so the presentation can continue.

For the best result:

- Use Chrome or Edge.
- Allow microphone permission for `localhost`.
- Speak close to the microphone.
- Use a quiet room.
- Say a short, clear report such as:

```text
AURA, casing line ke paas pressure badh raha hai aur H2S smell aa rahi hai.
```

The current prototype stores submitted voice signals in the browser's local storage under `sif-voice-signals`. This is demo persistence only, not a production database.

## 7. Production Build Check

To check that the project compiles correctly:

```powershell
npm run build
```

A successful build creates the `dist` folder.

## 8. Vercel Deployment

The project includes `vercel.json` with the Vite build settings. Import the
repository into Vercel and use the default settings, or deploy from the
project root with:

```powershell
npx vercel
```

Production deployment:

```powershell
npx vercel --prod
```

Build command: `npm run build`
Output directory: `dist`

To preview the production build locally:

```powershell
npm run preview
```

Use the URL shown in the terminal.

## 8. Common Problems

### `npm is not recognized`

Node.js is not installed correctly or VS Code was opened before Node.js was installed. Install Node.js from https://nodejs.org/, restart VS Code, and run:

```powershell
node --version
npm --version
```

### `pnpm is not recognized`

Do not use `pnpm` for this handoff. Use npm commands:

```powershell
npm install
npm run dev
```

### Port 8443 is already in use

Close the existing Vite terminal, or stop the process using that port. Then run:

```powershell
npm run dev
```

The app can also be opened on the alternate port shown by Vite.

### Voice button does not use the microphone

Use Chrome or Edge, allow microphone permission, and reload the page. The prototype fallback will still show a prepared field signal if microphone access is unavailable.

### Images do not appear

Make sure the entire project folder was copied, including the `images` folder. Do not copy only `src` or only `index.html`.

### App looks stale after changes

Reload the browser with:

```text
Ctrl + Shift + R
```

## 9. Important Prototype Limitation

This is a front-end demonstration. It simulates the NLP and historical record matching flow so the complete judge-facing experience can be shown.

A production version would need:

- Secure backend APIs
- Real speech-to-text service
- NLP and hazard extraction service
- Central safety database
- User login and role-based permissions
- SMS, WhatsApp, push and radio integrations
- Offline synchronization for remote sites
- Auditable notification and action history
- Real device integration for the AURA wearable

The prototype's purpose is to communicate the product workflow, user experience and system architecture clearly.

## 10. Quick Start Summary

```powershell
cd C:\Users\Admin\Desktop\SIF
npm install
npm run dev
```

Then open:

```text
http://localhost:8443/
```
