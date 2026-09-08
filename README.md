# 🩸 Nankwanya (Uganda)
### Geofencing-Based Blood Donation Mobilization Platform

> **Honoring Hajj Mohamod Nankwanya** — Celebrated across Uganda as the *"Blood Making Machine,"* a 215-time voluntary blood donor and community mobilizer honored by the Uganda Red Cross Society. This platform carries forward his legacy by eliminating the critical lag between emergency blood needs and donor mobilization in Ugandan hospitals.

---

## 📌 Executive Summary & Problem

Across Ugandan regional referral hospitals (e.g. Mbarara Regional Referral Hospital, Gulu, Mbale, Fort Portal), acute blood shortages during surgical emergencies, post-partum hemorrhages, and pediatric malaria-induced anemia claim lives daily. 

Traditional mobilization relies on broad, unfocused broadcast calls or delayed radio appeals. **Nankwanya** solves this by:
1. Enabling hospital staff to define emergency blood requests with an adjustable **geofence radius (2–10 km)**.
2. Running a server-side **Haversine distance calculation** against verified voluntary donors in that district.
3. Instantly dispatching targeted SMS alerts via the **Africa's Talking Uganda Gateway**: `"Urgent need for [bloodType] blood at [facility]. Reply YES if available. - Nankwanya"`.
4. Streaming real-time donor confirmations (`YES` via SMS or 1-tap mobile portal) straight to the hospital's live operations dashboard and map.

---

## 🏗 Architecture & Tech Stack

```
                                  +---------------------------------------+
                                  |         Hospital Staff (Admin)        |
                                  |   (Selects Blood Type, Radius 2-10km) |
                                  +-------------------+-------------------+
                                                      |
                                                      v
+-----------------------------+         +-------------+-------------+
| Verified Voluntary Donors   | <====== |  Africa's Talking SMS API |
| (Mbarara Municipality Pool) |  SMS    |  (Real Uganda Gateway)    |
+--------------+--------------+         +-------------+-------------+
               |                                      ^
        Replies "YES"                                 | Haversine Filter (2-10km)
               |                                      | & Blood Compatibility
               v                                      |
+--------------+--------------+         +-------------+-------------+
| Africa's Talking Inbound    | ======> |  Nankwanya Backend API    |
| SMS Webhook / In-App Tap    |         |  (Node.js + Express)      |
+-----------------------------+         +-------------+-------------+
                                                      |
                                                      v
                                        +-------------+-------------+
                                        | Live Real-Time Dashboard  |
                                        | (Leaflet Map + Counters)  |
                                        +---------------------------+
```

- **Frontend:** React (Vite) + Tailwind CSS + Leaflet.js (dark-mode CartoDB tiles + pulsing geofence radius) + Firebase Web SDK.
- **Backend:** Node.js + Express API.
- **Database & Realtime:** Firebase Firestore (with resilient in-memory / local fast sync fallback for zero-friction hackathon demos).
- **SMS Gateway:** **Africa's Talking API** (Real integration with Sandbox & Live Uganda mobile numbers).
- **WhatsApp Channel:** Swap-in ready stub (`sendWhatsAppAlert()`) with exact same signature as SMS service.
- **Geofencing Engine:** Spherical Haversine distance matrix with Red Blood Cell (RBC) compatibility matching.

---

## 📁 Repository Structure

```
nankwanya/
├── frontend/                     # React + Vite + Tailwind web application
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx              # Leaflet map with geofence circle & donor pins
│   │   │   ├── CreateRequestModal.jsx   # Blood need form with live radius slider
│   │   │   ├── LiveResponseCounter.jsx  # Live confirmed/alerted counter
│   │   │   ├── LiveFeed.jsx             # Real-time incoming response activity stream
│   │   │   ├── SmsLogDrawer.jsx         # Africa's Talking SMS audit log viewer
│   │   │   ├── SimulatorBar.jsx         # Floating Judge/Demo test toolbar
│   │   │   └── TributeBanner.jsx        # Hajj Mohamod Nankwanya tribute modal
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx          # Public landing & tribute page
│   │   │   ├── AdminDashboard.jsx       # Hospital operations command center
│   │   │   ├── DonorPortal.jsx          # Mobile donor portal (GPS + 1-tap confirm)
│   │   │   └── RequestHistory.jsx       # Campaign history and completion logs
│   │   ├── services/
│   │   │   ├── api.js                   # REST API client
│   │   │   └── firebase.js              # Firestore real-time listener & fallback
│   │   └── context/
│   │       └── AuthContext.jsx          # Admin/Donor role provider & switcher
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   └── firebaseAdmin.js         # Firebase Admin SDK initialization
│   │   ├── models/
│   │   │   └── store.js                 # Unified Firestore / Memory collection helpers
│   │   ├── routes/
│   │   │   ├── facilityRoutes.js        # Health facilities API
│   │   │   ├── donorRoutes.js           # Donor registration & GPS update API
│   │   │   ├── requestRoutes.js         # Emergency blood requests & dispatch API
│   │   │   ├── alertRoutes.js           # Inbound SMS webhook & simulator API
│   │   │   └── statsRoutes.js           # Global platform impact metrics
│   │   ├── services/
│   │   │   ├── geofence.js              # Haversine distance formula & blood matching
│   │   │   ├── smsService.js            # Africa's Talking SMS Gateway client
│   │   │   └── whatsappService.js       # Swap-in ready WhatsApp Business stub
│   │   └── server.js                    # Express application entrypoint
├── seed/
│   └── seedData.js               # Seeds Mbarara hospitals & ~40 realistic donors
└── README.md                     # Documentation, setup & 2-minute demo script
```

---

## 🌐 Geofencing & Matching Logic

### How it works (MVP)
1. Each donor record stores their last known location `{ lat, lng }` (via browser GPS or seeded profile).
2. Each hospital stores `{ lat, lng }` (e.g. Mbarara Regional Referral Hospital at `-0.6085, 30.6565`).
3. When a blood request is created with radius \( R \) (km, default 5, adjustable 2–10 km), the server computes great-circle distance using the **Haversine Formula**:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$

$$d = R_{\text{earth}} \cdot \Delta\sigma \quad (R_{\text{earth}} = 6371.0088\text{ km})$$

4. Donors are filtered by \( d \le R \) and evaluated against the Red Blood Cell (RBC) compatibility table (`O-` universal donor, exact match, etc.).
5. **Computational Complexity:** \( \mathcal{O}(n) \) over donors. At demo/pilot scale (hundreds to low thousands of records), this executes in under **5 milliseconds**.

### Scale-Up Roadmap (Production)
For nationwide scale (>100,000 donors across Uganda):
- Migrate to **PostgreSQL + PostGIS** using spatial indexing (`GIST`) and `ST_DWithin(geom, ST_MakePoint(lng, lat), radius_meters)`.
- Use Uber **H3** or Google **S2** discrete global grid spatial hierarchical indexing for pre-aggregated donor spatial buckets.

---

## 📱 SMS Integration Specifics (Africa's Talking Uganda)

- **Outbound SMS Dispatch:** Broadcasts formatted emergency alert:
  `"Urgent need for B+ blood at Mbarara Regional Referral Hospital (MRRH). Reply YES if available to donate today. - Nankwanya"`
- **Inbound Two-Way SMS Webhook:** Route `POST /api/alerts/sms-inbound` processes incoming SMS payloads from Africa's Talking (`from`, `text`), identifies the donor by phone number, marks the alert as `confirmed` or `declined`, and updates hospital dashboard counters in real time.
- **Audit Logging:** Every single SMS attempt is recorded in the `alerts` collection with message ID, carrier status, timestamp, and any error message.

### Testing with Africa's Talking Sandbox
1. Register a free account at [africastalking.com](https://africastalking.com).
2. Go to **Sandbox App** -> **Settings** -> **API Key** -> Generate API Key.
3. Set in `backend/.env`:
   ```env
   AT_USERNAME=sandbox
   AT_API_KEY=your_sandbox_api_key_here
   ```
4. In the Africa's Talking Sandbox Simulator ([simulator.africastalking.com](https://simulator.africastalking.com)), test inbound SMS with numbers matching Ugandan seed format (`+256770000001`).

---

## 💬 WhatsApp Integration (Swap-in Ready)

The WhatsApp service (`backend/src/services/whatsappService.js`) implements the identical interface:
```javascript
sendWhatsAppAlert({ to, message, meta })
```
To enable live WhatsApp Cloud API in production:
1. Complete Meta WhatsApp Business API verification.
2. Insert your WABA Phone Number ID and System Access Token in `whatsappService.js`.
3. No route or controller changes are required.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20)
- **npm**: v9+

### 2. Installation
Clone repository and install dependencies:

```bash
cd nankwanya

# Install backend dependencies
cd backend
npm install
cp .env.example .env

# Install frontend dependencies
cd ../frontend
npm install
cp .env.example .env

cd ..
```

### 3. Environment Variables

#### `backend/.env`
```env
PORT=5000
AT_USERNAME=sandbox
AT_API_KEY=YOUR_AFRICAS_TALKING_API_KEY
AT_SENDER_ID=
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=
```
*(Note: If Africa's Talking keys or Firebase keys are not provided, the backend operates seamlessly in simulated sandbox mode so the entire demo flow works out of the box).*

#### `frontend/.env`
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
```

### 4. Running the Application

Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
# Running at http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Running at http://localhost:3000
```

---

## 🩸 Seed Data (Mbarara, Uganda)

The platform comes pre-seeded with realistic healthcare facilities and donors around **Mbarara Municipality**:
- **3 Hospitals:**
  1. *Mbarara Regional Referral Hospital (MRRH)* `[-0.6085, 30.6565]`
  2. *Mayanja Memorial Hospital* `[-0.5982, 30.6691]`
  3. *Holy Innocents Children's Hospital* `[-0.6350, 30.6320]`
- **40 Voluntary Donors:** Located across Kamukuzi, Kakoba, Nyamitanga, Ruharo, Kashanyarazi, Katete, and Bwizibwera road with realistic blood types (O+, A+, B+, AB-, etc.) and Ugandan phone numbers (`+256770000001` - `+256770000040`).

To re-seed at any time:
```bash
cd backend
npm run seed
```

---

## 🎬 2-Minute Judge Demo Script

Follow this exact walkthrough sequence live in front of hackathon judges:

| Step | Time | Screen | Action | What to Explain to Judges |
| :--- | :--- | :--- | :--- | :--- |
| **1. Heritage & Origin** | `0:00 - 0:20` | Landing Page | Open `http://localhost:3000`. Click *"Read Heritage & Mission"* badge. | Explain that **Nankwanya** is named in tribute to **Hajj Mohamod Nankwanya**, Uganda's 215-time voluntary blood donor. Introduce the core goal: closing the emergency blood mobilization gap in Uganda. |
| **2. Hospital Operations** | `0:20 - 0:45` | Hospital Live Ops | Click *"Hospital Live Ops"*. Show Mbarara Regional Referral Hospital on the Leaflet map with donor pins. | Show the interactive map of Mbarara. Point out that all 40 voluntary donors are rendered with their distance from MRRH. |
| **3. Emergency Broadcast** | `0:45 - 1:15` | Request Modal | Click *"Raise Blood Need"*. Select **B+ Blood**, **Urgent**, and slide the **Radius to 5 km**. Click *"Broadcast Alert"*. | Explain the server-side **Haversine calculation** matching donors within 5 km. Highlight that **Africa's Talking SMS API** is immediately called. Open *"SMS Gateway Logs"* to show the live transmission payload. |
| **4. Live Donor Response** | `1:15 - 1:45` | Donor Portal / Simulator | Use the floating **Judge Demo Bar** at the bottom: click *"Simulate SMS 'YES'"* (or switch to *"Donor Portal"* tab and tap *"I'm Available"*). | Watch the Hospital Live Dashboard in real-time: **Confirmed (YES) count ticks up**, the incoming feed streams the confirmation event, and the donor's pin on the map **turns green**! |
| **5. Batch Mobilization** | `1:45 - 2:00` | Hospital Live Ops | Click *"Batch 3 Donors"* on the Demo Bar. | Show the progress bar hitting 100% goal fulfillment (e.g. 3 of 3 units secured). Conclude with the scale-up roadmap to PostGIS and national blood bank integration. |

---

## ⚖️ What's Real vs Stubbed

| Component | Status | Implementation Details |
| :--- | :--- | :--- |
| **Geofencing & Haversine Distance** | 🟢 **Real** | Server-side spherical Haversine math with RBC compatibility matrix |
| **Africa's Talking SMS Dispatch** | 🟢 **Real** | Full SDK integration with Uganda numbers, Sandbox/Live modes, and audit logging |
| **Two-Way Inbound SMS Webhook** | 🟢 **Real** | Parses "YES"/"NO" incoming webhook replies and matches donor profiles |
| **Live Map & Geofence Visualization**| 🟢 **Real** | Interactive Leaflet map with real Mbarara GPS coordinates and radius circle |
| **Realtime Dashboard Counters** | 🟢 **Real** | Firestore live collection listeners + fallback fast sync |
| **Donor Browser Geolocation** | 🟢 **Real** | Browser `navigator.geolocation` + Mbarara neighborhood fallback |
| **WhatsApp Business API** | 🟡 **Stubbed** | Swap-in ready wrapper with identical interface to SMS service |
| **National Identity / Payment API** | ⚪ **Out of Scope** | Voluntary unpaid blood donation platform MVP |

---

## 🏛️ Known Compliance & Scale-Up Steps (not built into this MVP)

This prototype demonstrates core mobilization and geofencing architecture for emergency blood response. In a production rollout across Uganda, the following regulatory, operational, and telecommunications steps are documented prerequisites:

1. **SMS Sender ID Pre-Registration with UCC & Telcos:**
   - Formal application and registration of an alphanumeric Sender ID (e.g. `NANKWANYA` or `UBTS-ALERT`) with the **Uganda Communications Commission (UCC)**, MTN Uganda, and Airtel Uganda is legally required prior to dispatching public A2P SMS alerts.
   - Lead time is typically ~2–3 weeks. For this hackathon/pilot demo, **Africa's Talking Sandbox Mode** is utilized.
2. **Two-Way SMS Reliability at National Scale:**
   - Standard Application-to-Person (A2P) SMS does not reliably support two-way alphanumeric replies at high volume across mixed telecommunications networks.
   - While the "reply YES" flow functions smoothly in sandbox and demo testing, the documented production path uses either **in-app confirmations** (via mobile web/USSD `*...#`) or a dedicated **two-way national short code** (e.g. `8888`) registered with UCC.
3. **Personal Data Protection Office (PDPO) Registration:**
   - Under Uganda's **Data Protection and Privacy Act (DPPA 2019)**, medical and health attributes (such as blood type) and precise geolocation are classified as **special-category personal data**.
   - Prior to collecting live donor records in production, Nankwanya must register as a certified **Data Controller and Data Processor** with the **Personal Data Protection Office (PDPO)** under the National Information Technology Authority, Uganda (NITA-U). The current MVP demonstrates strict alignment by enforcing explicit consent on sign-up, masking phone numbers by default, and requiring audited access logs (`contactDisclosures`) before any donor contact is revealed.
4. **Institutional Role & UBTS Alignment:**
   - Nankwanya is purposefully positioned as a **digital donor-mobilization and dispatch layer** feeding established **Uganda Blood Transfusion Services (UBTS)** collection regional hubs and certified hospital blood banks (e.g. MRRH).
   - Nankwanya does **not** conduct blood collection, serological testing (HIV, Hepatitis B/C, Syphilis), or clinical blood storage. All physical testing and transfusions remain strictly under authorized Ministry of Health and UBTS clinical supervision.

---

## 📜 License & Acknowledgements
- Named in honor of **Hajj Mohamod Nankwanya** and the **Uganda Red Cross Society** voluntary blood donation teams.
- Open source under MIT License.

---

## ⚡ One-Click Deployment to Vercel

Nankwanya is pre-configured for full-stack deployment on **Vercel** (`vercel.json` + serverless API handler in `api/index.js`).

### Quick Vercel Setup:
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your repository: `tumushabehappy325-bit/Nankwanya`.
3. Vercel will automatically detect the settings:
   - **Framework Preset**: *Vite / Other*
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
4. *(Optional)* Add your Environment Variables under **Settings > Environment Variables**:
   - `AT_USERNAME`: your Africa's Talking username (or `sandbox`)
   - `AT_API_KEY`: your Africa's Talking API key
   - `FIREBASE_PROJECT_ID`: your Firebase project ID
5. Click **"Deploy"**!

Your frontend SPA and serverless `/api` endpoints will be live immediately on your custom `.vercel.app` URL.
