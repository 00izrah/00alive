
# izrah.live 🫀

> One page. One question. *Is Izrah still alive?*

A deceptively simple, zero-maintenance status site that answers the ultimate question by passively reading my Spotify listening activity. Visitors see a deadpan personality; engineers see a serverless architecture stitching together multiple APIs.

## ⚡ How it Works

The site runs entirely on autopilot. There is no manual "status updating."
1. **The Signal:** Netlify Serverless Functions ping the Spotify Web API to check if I am currently listening to a track, or when I last listened to one.
2. **The Vitals:** The Spotify Audio Features API extracts the track's BPM (Tempo), Energy, and Valence (Mood).
3. **The Pulse:** A custom SVG EKG line dynamically animates its pulse rate to match the exact BPM of the current track. If I've been offline too long, it flatlines.
4. **The Commentary:** The track metadata is fed to an ai model via a rigid system prompt to generate a single, deadpan, context-aware one-liner about my current state.
5. **The Streak:** A scheduled Netlify Cron job runs at midnight (WAT) to update my consecutive days of listening activity stored in a single-row Supabase PostgreSQL database.

## 🛠️ Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Framer Motion (optional/animations)
* **Backend:** Netlify Functions (Node.js)
* **Database:** Supabase (PostgreSQL)
* **Integrations:** Spotify Web API


Built to avoid answering "how are you?" texts.
