# Pulse — Real-Time Multi-Device Messaging Application

Pulse is a modern, low-latency, real-time messaging application designed to work seamlessly across desktop (PC) and mobile browsers. Powered by **Firebase Cloud Firestore** and **Firebase Authentication**, Pulse enables real-time multi-device message streaming, group channels, direct messaging, active presence tracking, typing indicators, and media attachments.

---

## 🚀 Live Demo

- **Live Application URL:** [https://pulse-chat-app-998n.onrender.com/](https://pulse-chat-app-998n.onrender.com/)

*To test real-time synchronization between two devices/users:*
1. Open the live URL on your PC and log in as **Alice** (`@alice`).
2. Open the exact same URL on your smartphone or an Incognito tab and log in as **Bob** (`@bob`).
3. Send messages, add contacts, create hubs, or start typing—everything syncs live across both devices.

---

## 🛠️ How to Set Up and Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher) installed locally.
- A modern web browser (Chrome, Safari, Firefox, Edge).
- A free [Firebase Console](https://console.firebase.google.com/) account (if setting up your own cloud backend).

---

### Local Development Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/IAmMagnum/pulse-chat-app.git
   cd pulse-chat-app
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase Credentials:**
   Open `public/index.html` (or `real_time_chat_app.html`) and verify or update the `firebaseConfig` object with your project keys:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_FIREBASE_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Enable Firebase Services in Firebase Console:**
   - **Authentication:** Go to *Build > Authentication > Sign-in method* and enable **Anonymous**.
   - **Cloud Firestore:** Go to *Build > Firestore Database*, create a database, and configure rules for read/write access during development:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if true;
         }
       }
     }
     ```

5. **Start the Local Development Server:**
   ```bash
   npm start
   # or
   node server.js
   ```

6. **Access the App:**
   Open your browser and navigate to `http://localhost:3000`.

---

## 📊 Data Model & Main Design Decisions

### 1. Data Schema (Cloud Firestore Collections)

The application utilizes a modular document-oriented schema in Cloud Firestore under `/artifacts/pulse-chat-app/public/data/`:

* **`users/{handle}`**
  - `name` *(string)*: Display name (e.g., `"Alice Vance"`).
  - `handle` *(string)*: Unique username handle (e.g., `"alice"`).
  - `avatar` *(string)*: Profile avatar URL.
  - `isOnline` *(boolean)*: Network presence indicator.
  - `lastActive` *(timestamp)*: Last activity heartbeat.

* **`channels/{roomId}`**
  - `id` *(string)*: Unique hub slug (e.g., `"general"`).
  - `name` *(string)*: Hub name (e.g., `"General Hub"`).
  - `createdBy` *(string)*: Creator handle.
  - `createdAt` *(timestamp)*: Creation time.

* **`dms/{dmId}`**
  - `id` *(string)*: Combined participant key (e.g., `"alice_bob"`).
  - `participants` *(array of strings)*: Array containing handles `["alice", "bob"]`.
  - `partnerName` *(string)*: Recipient display name.
  - `partnerHandle` *(string)*: Recipient handle.

* **`messages/{messageId}`**
  - `chatId` *(string)*: Target room ID or DM ID.
  - `senderHandle` *(string)*: Sender's handle.
  - `senderName` *(string)*: Display name.
  - `senderAvatar` *(string)*: Avatar URL.
  - `content` *(string)*: Text payload.
  - `attachmentUrl` *(string, optional)*: Base64 or cloud URL image string.
  - `createdAt` *(timestamp)*: Server timestamp for accurate order.

* **`typing/{handle}`**
  - `handle` *(string)*: User handle.
  - `chatId` *(string)*: Target active chat ID.
  - `isTyping` *(boolean)*: Live typing status.
  - `updatedAt` *(timestamp)*: Throttle timestamp.

---

### 2. Main Design Decisions

- **Single-File Native Component Architecture:** Built using clean, self-contained HTML5, Tailwind CSS, and ES Modules without heavy frontend framework overhead, ensuring fast initial page loads (< 1s) on mobile connections.
- **Reactive Stream Listeners (`onSnapshot`):** Utilizes Firestore snapshot listeners for bidirectional real-time data streaming without requiring manual polling loops or WebSocket socket restarts.
- **Glassmorphism & Mobile-First UX:** Designed with a dark Nordic Slate color palette, amber/teal accents, responsive drawer navigation, touch-friendly targets, and proper chat view auto-scroll.
- **Graceful Auth Fallback:** Integrates Firebase Anonymous Auth with an automatic local session fallback so cross-origin domain or referer blocks don't disrupt user access.

---

## ✅ Feature Status & Future Roadmap

### Finished Features
- [x] Multi-device real-time sync across PC and mobile.
- [x] Instant profile switching (Alice, Bob, Charlie, or custom display handles).
- [x] Real-time live typing indicator across connected sessions.
- [x] Custom Group Hub creation & dynamic Direct Messaging (DM) contact additions.
- [x] Active state highlight syncing between Channels and Direct Messaging sidebar items.
- [x] Responsive drawer sidebar with backdrop toggling for mobile devices.
- [x] Base64 image attachment preview and real-time media streaming.
- [x] Global Session Logout button to switch test accounts cleanly.

### What Isn't Finished
- [ ] End-to-End Encryption (E2EE) payload masking before DB storage.
- [ ] Persistent file storage via Firebase Cloud Storage bucket (currently using base64 preview payloads).
- [ ] Push Notifications (Service Worker Web Push / FCM integration).
- [ ] Audio/Video webRTC call integration.

### What I Would Do With More Time
1. **Push Notifications (FCM):** Implement background web push notifications using Firebase Cloud Messaging so mobile users get alerted when receiving direct messages while the app tab is inactive.
2. **Infinite Scroll Pagination:** Add cursor-based document pagination using Firestore `limitToLast()` and `startBefore()` for smooth message history loading.
3. **Rich Message Reactions & Threads:** Allow users to add emoji reactions to individual chat bubbles and start nested response threads.
4. **End-to-End Encryption (E2EE):** Incorporate Web Crypto API (AES-GCM) so message contents are encrypted client-side before sending to Firestore.

---

## 🤖 AI Tools Used & Purpose

* **Gemini (Google AI):**
  - **Interface Layout & CSS Generation:** Used to generate responsive Tailwind CSS glassmorphic UI components, mobile sliding drawer mechanics, and color palette schemes.
  - **Firebase Firestore Logic & Real-time Integration:** Assisted in writing clean `onSnapshot` queries, debounced typing status update logic, and domain restriction error handling.
  - **Debugging & Troubleshooting:** Helped diagnose and resolve issues like syntax errors, API key referrer domain restrictions, mobile flex height overflows, and active sidebar highlight states.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).