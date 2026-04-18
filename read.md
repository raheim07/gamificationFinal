# Gamified Physical Activity Study (GSSI)

A Next.js web application supporting a cardiovascular risk reduction research study. The app tracks participant step counts, applies gamification mechanics for the intervention group, and provides dashboards for participants, support members, and study administrators.

---

## Overview

The study compares two groups of participants:

- **Control group** — logs steps with a simple tracker, no gamification
- **Intervention group** — logs steps with points, streaks, badges, a leaderboard, and encouragement from support members

Support members are paired with intervention participants and can send motivational messages. Administrators can view all participant data, compare groups, and export results as CSV.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + RPC) |
| Auth | Custom username/study-code flow via Supabase |
| Analytics | Vercel Analytics |

---

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout (fonts, metadata)
│   └── page.tsx            # Entry point — routes between onboarding and dashboards
├── components/
│   ├── entry-screen.tsx        # Role selection screen
│   ├── participant-onboarding.tsx  # Registration flow (study code → nickname)
│   ├── participant-login.tsx       # Returning participant login
│   ├── support-onboarding.tsx      # Support member registration
│   ├── admin-login.tsx             # Admin password login
│   ├── app-header.tsx              # Sticky header with user info + theme toggle
│   ├── control-dashboard.tsx       # Step tracker for control group
│   ├── intervention-dashboard.tsx  # Full gamified dashboard
│   ├── support-dashboard.tsx       # Support member view + messaging
│   ├── admin-dashboard.tsx         # Study analytics + CSV export
│   ├── step-chart.tsx              # Weekly bar chart (Recharts)
│   ├── progress-ring.tsx           # SVG circular progress indicator
│   ├── animated-counter.tsx        # Smooth number animation component
│   ├── badge-modal.tsx             # Badge unlock celebration modal
│   └── ui/                         # shadcn/ui component library
├── lib/
│   └── store.ts            # Client-side state (localStorage) + gamification logic
├── src/
│   ├── lib/supabaseClient.js       # Supabase client initialisation
│   └── services/
│       └── authService.js          # Auth RPC calls (register, login, support lookup)
└── hooks/
    ├── use-theme.ts        # Dark/light theme toggle with localStorage persistence
    └── use-mobile.ts       # Mobile breakpoint detection
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.9.0
- A Supabase project with the required schema (see [Database Setup](#database-setup))

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd <project-folder>

# Install dependencies
npm install   # or pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_PASSWORD=your_chosen_admin_password
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm run start
```

---

## Database Setup

The app uses Supabase with a `participants` table and a stored procedure for registration.

### `participants` table

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `alias` | text | Participant display name |
| `study_code` | text | Invite code provided by researchers |
| `support_code` | text | Code shared with support members |
| `group_type` | text | `'control'` or `'intervention'` |
| `created_at` | timestamptz | Registration timestamp |

### `register_participant` RPC

The app calls `supabase.rpc('register_participant', { p_study_code, p_alias })` to register a participant. This function should validate the study code, assign the participant to a group, generate a unique support code, and return the new participant record.

---

## User Roles

### Participant (Control)
- Log daily step counts
- View weekly total and adherence percentage
- See a 7-day bar chart breakdown

### Participant (Intervention)
All of the above, plus:
- **Points** — earned per 100 steps logged
- **Streaks** — consecutive days meeting the 5,000-step goal
- **Level system** — Beginner → Active → Champion
- **8 unlockable badges** (First Steps, Week Warrior, Goal Crusher, etc.)
- **Weekly challenge** — 35,000 steps with progress bar
- **Leaderboard** — top 5 intervention participants by points
- **Encouragement feed** — messages from support members

### Support Member
- Linked to an intervention participant via support code
- View participant's stats, level, and weekly chart
- Send motivational messages that appear in the participant's feed

### Admin
- Overview of all users, control vs. intervention counts
- Group comparison (avg steps, points, streak, engagement)
- Toggle individual participants between groups
- Export all participant data as CSV

---

## Gamification Logic

All gamification state is stored in `localStorage` via `lib/store.ts`.

| Mechanic | Calculation |
|---|---|
| Points | `floor(total_steps / 100)` |
| Streak | Consecutive days with ≥ 5,000 steps (counting backwards from today) |
| Adherence | `(days_meeting_5k_goal / total_days_logged) × 100` |
| Engagement score | `min(100, days_logged × 5 + streak × 10 + badges × 8 + points × 0.05)` |
| Level: Beginner | 0–499 points |
| Level: Active | 500–1,499 points |
| Level: Champion | 1,500+ points |

---

## Theme

The app ships with a dark theme by default (deep navy/teal palette) and a full light mode. The theme preference is persisted to `localStorage` under the key `gssi_theme`. Toggle is available on all screens via the Sun/Moon icon button.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Notes

- Step data, badges, and messages are stored in `localStorage`. This is intentional for the prototype phase; production use would persist this to Supabase.
- TypeScript build errors are currently suppressed (`ignoreBuildErrors: true`) to allow rapid iteration.
- The admin password is stored as a plain environment variable (`NEXT_PUBLIC_ADMIN_PASSWORD`). For production, replace with a proper server-side authentication check.