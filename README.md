## License
This repository is provided solely for recruitment and portfolio review purposes.  
Unauthorized reproduction, distribution, or commercial use of the code is prohibited.  

---

## FlowMinder
A real-time Zoom App that helps keep meetings structured, focused, and inclusive. Built in a Penn Engineering hackathon by a 4-person team.

---

## 🧭 Core idea
Remote meetings often drift off-topic or run long when certain participants dominate or derail the conversation. Others disengage or hesitate to contribute, often due to power dynamics or experience gaps. Even with agendas in place, it can be difficult to steer discussions back on track without seeming abrupt, leaving meetings unfocused and without clear outcomes.

We set out to make meetings more structured and efficient by building FlowMinder, a real-time Zoom App that runs directly inside the Zoom client. It gives hosts lightweight tools to manage agendas and live timers, while also giving participants the ability to nudge or signal when it’s time to move on. By combining agenda display with host control and participant signals, our goal was to keep meetings structured, focused, time-bound, and inclusive.

---

## ✨ Features
- **Agenda Management** – Hosts can create, edit, and broadcast agenda items before or during a meeting.
- **Timers** – Each agenda item can have a timer, visible to host or all participants, with countdowns synced in real time.
- **Nudges** – Participants can anonymously signal “speak up” or “speak less” with built-in cooldowns to avoid spam.
- **Context for Late Joiners** – Current agenda item is always displayed so newcomers instantly know the topic.
- **Host Control** – Participants can view but not edit agendas; only hosts publish changes.

---

## 🏗️ Architecture

FlowMinder is organized into three main layers with managed services to simplify deployment and ensure reliability. Real-time communication and secure API integrations were central to the design.

1. **Client Layer**
   - **Zoom App (in-meeting sidebar):** Provides agenda view, timers, and nudges directly inside the Zoom client via the Zoom App SDK.
   - **Web UI (pre-meeting):** Hosts prepare agendas and timers in advance using a browser interface.  
   Both entry points connect back to the frontend service and stay synchronized in real time.

2. **Frontend Layer (Next.js on Vercel)**
   - **Frameworks:** React + TypeScript for type safety, Zustand for local state management, Tailwind CSS for rapid UI styling.
   - **Optimistic UI:** User actions are reflected instantly and rolled back if rejected by the backend, creating a “snappy” experience.
   - **Scoped SDK loading:** The Zoom App SDK is dynamically loaded only when needed (meeting routes), reducing bundle size.

3. **Service Layer (Express.js on Render)**
   - **REST API:** Stateless endpoints for CRUD operations (meetings, agendas, timers).
   - **Socket.IO:** Keeps all clients in sync (agenda changes, timer updates, nudges) without polling.
   - **OAuth handler:** Manages Zoom OAuth flow, refreshes tokens securely, and ensures only authorized users can act as hosts.
   - **Database access layer:** Uses `pg.Pool` for performance-critical SQL queries and `supabase-js` for secure token handling.

4. **Persistence Layer (Supabase PostgreSQL)**
   - Stores normalized tables for meetings, agenda items, nudges, and Zoom users/tokens.
   - Composite indexes on `(meeting_id, zoom_meeting_id)` provide O(log n) lookups.
   - Encryption at rest and TLS in transit protect sensitive data.

5. **External Integration**
   - **Zoom App SDK:** Supplies meeting and user context directly inside Zoom.
   - **Zoom REST APIs:** Used by the backend to create/list meetings and sync agendas.
   - **OAuth 2.0:** Access/refresh tokens stored server-side only, with limited scopes for least-privilege access.

### Key Design Choices
- **Real-time first:** WebSockets via Socket.IO ensure that timers, agenda changes, and nudges propagate instantly to all participants.
- **Authoritative server:** The backend is the single source of truth; clients reconcile with it to prevent state drift.
- **Managed services:** Vercel (frontend), Render (backend), and Supabase (database) reduced infrastructure overhead so the team could focus on features.
- **Security by design:** Secrets never leave the backend; roles are enforced (host vs. participant) for safe collaboration.

### 🔒 Security (limited for hackathon)
- Zoom OAuth tokens stored securely in Supabase (never exposed client-side).
- Role-based access: hosts manage agendas/timers; participants view and nudge.

---

## 🚀 Tech Stack
- **Languages:** TypeScript, JavaScript, SQL
- **Frontend:** React, Next.js, Tailwind, Zustand
- **Backend:** Node.js (Express.js), Socket.IO
- **Database:** Supabase (PostgreSQL)
- **Infrastructure:** Vercel (frontend), Render (backend)
- **Integrations:** Zoom App SDK, Zoom REST API

---

## 📂 Project Status

FlowMinder was built during a hackathon (May–Aug 2025). Two months in, Zoom released its own agenda manager with timers, validating the problem we targeted. While this project is not actively maintained, it demonstrates:
- Full-stack development in a distributed hackathon team
- Real-time event handling with WebSockets
- Secure integration with external APIs and OAuth flows
- Deployment with modern managed services