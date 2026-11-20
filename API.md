# 📡 API.md — AgriCare

## Backend: Firebase

## Entity Relationship (Foreign Keys)

```
┌──────────┐
│  users   │ ← Central entity (all accounts)
└────┬─────┘
     │ FK: userId
     ├── admin/         → admin-specific (permissions, superAdmin)
     ├── farmer/        → farmer-specific (location, animals, favorites)
     ├── technician/    → tech-specific (rating, specializations, availability)
     │
     │ FK: farmerId / technicianId / ownerId / authorId
     ├── animals.ownerId → users.id
     ├── appointments.farmerId + technicianId → users.id
     ├── appointments.animalId → animals.id
     ├── consultations.farmerId + technicianId → users.id
     ├── emergencyRequests.farmerId, respondedBy → users.id
     ├── knowledgeBase.authorId → users.id
     ├── communityForum.authorId → users.id
     ├── reviews.farmerId + technicianId → users.id
     ├── reports.reporterId + targetId → users.id
     ├── notifications.userId → users.id
     ├── announcements.createdBy → users.id
     └── chats.participants[] → users.id[]
```

### Collections
| Collection | Key Fields | FK → users.id |
|-----------|-----------|---------------|
| `users` | email, displayName, role, phoneNumber, status | — (is the central entity) |
| `admin` | userId, permissions[], superAdmin, dashboardAccess | userId |
| `farmer` | userId, location, barangay, lat/lng, totalAnimals, animals[], favoriteTechnicians[] | userId |
| `technician` | userId, name, rating, specializations[], experience, available, verificationStatus | userId |
| `animals` | name, type, breed, ownerId, healthStatus, weight | ownerId → farmer.userId |
| `appointments` | serviceType, farmerId, technicianId, animalId, status, date | farmerId, technicianId |
| `consultations` | farmerId, technicianId, animalId, subject, notes, status | farmerId, technicianId |
| `emergencyRequests` | farmerId, animalId, description, respondedBy, status | farmerId, respondedBy |
| `knowledgeBase` | title, category, content, authorId, authorRole, tags[] | authorId |
| `communityForum` | authorId, authorRole, title, content, category, likes, replies | authorId |
| `reviews` | technicianId, farmerId, rating, comment, appointmentId | farmerId, technicianId |
| `reports` | reporterId, targetId, type, description, status | reporterId, targetId |
| `notifications` | userId, type, title, body, read | userId |
| `announcements` | title, content, audience, priority, createdBy | createdBy |

### Authentication (Firebase Auth)
| Function | Description |
|----------|-------------|
| `signUp(email, password, name, role)` | Create account + Firestore doc |
| `signIn(email, password)` | Login + register FCM token |
| `signOut()` | Logout + unregister FCM token |
| `resetPassword(email)` | Send password reset email |
| `onAuthStateChanged(callback)` | Listen to auth state |

### Firestore Collections
| Collection | Key Fields |
|-----------|-----------|
| `users` | email, displayName, role, location, status, barangay, fcmTokens |
| `technicians` | name, rating, specializations, verificationStatus, available, latitude, longitude |
| `animals` | name, type, breed, ownerId, healthStatus, weight, gender, vaccinationUpToDate |
| `livestockCategories` | name, type, breeds[], icon |
| `appointments` | serviceType, farmerId, technicianId, status, date, time, animalName |
| `consultations` | farmerId, technicianId, animalId, subject, status, notes |
| `emergencyRequests` | farmerId, animalId, description, location, status, respondedBy |
| `knowledgeBase` | title, category, content, author, tags[], views |
| `communityForum` | authorId, title, content, category, likes, replies, views |
| `reviews` | technicianId, farmerId, rating, comment, appointmentId |
| `reports` | reporterId, targetId, type, description, status |
| `notifications` | userId, type, title, body, read |
| `announcements` | title, content, audience, priority, createdBy |

### Realtime Database Paths (Chat)
| Path | Purpose |
|------|---------|
| `chats/{chatId}` | Chat room metadata |
| `messages/{chatId}/{msgId}` | Individual messages |
| `typing/{chatId}/{userId}` | Typing indicator |
| `onlineStatus/{userId}` | Online/offline + lastSeen |

### Storage Paths
| Path | Purpose |
|------|---------|
| `profileImages/` | User profile photos |
| `animalImages/` | Animal photos |
| `chatImages/` | In-chat shared images |
| `documents/` | Uploaded documents |

### Map Tiles
- **Provider**: OpenStreetMap (free, no key)
- **URL**: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Library**: `@maplibre/maplibre-react-native`

### Technician qualifications and service matching (Firestore)

The app uses Firestore Native mode; these are document relationships enforced by the catalog and authenticated Cloud Functions, not SQL foreign keys.

| Collection | Document ID / relationship | Purpose |
|---|---|---|
| `animalTypes` | Stable IDs: `pig`, `cattle`, `goat`, `horse`, `carabao` | Canonical animal types; `swine` normalizes to `pig`. |
| `animalBreeds` | Stable breed ID; `animalTypeId` → `animalTypes/{id}` | Seeded Pig, Cattle, and Carabao breeds. Goat/Horse use currently admin-approved `livestockCategories` entries when available. |
| `serviceTypes` | Existing IDs `1`–`10` | Preserves existing service names and icon names. Service `3` remains unmapped until explicitly supported. |
| `specializations` | Stable main category ID; `animalTypeId` → `animalTypes/{id}` | Main animal categories selected by technicians. |
| `subSpecializations` | Stable sub ID; `specializationId`, `animalTypeId`, `serviceTypeId` | Exact technician qualification and animal/service mapping. |
| `users/{uid}` | `uid`, `specializationIds[]`, `subSpecializationIds[]`, `qualificationKeys[]` | The document ID and `uid` match Firebase Auth. Farmers start `active`; technicians start `pending` for proof review. A qualification key is `{animalTypeId}:{serviceTypeId}`; `qualificationVerified` is set only by the authenticated qualification function. Existing unknown qualifications remain unverified. |
| `publicProfiles/{uid}` | Same document ID as `users/{uid}` | Server-generated, allowlisted display and qualification fields. Email, phone, address, ID/proof URLs, and FCM tokens stay out of client-readable profiles. |
| `appointments/{id}` | `farmerId`, `technicianId`, `animalRecordId` → `animals/{id}`, `serviceTypeId`, `animalTypeId`, `animalBreedId` | Request references. `eligibleTechnicianIds[]` limits general discovery; `requestMode` is `general` or `direct`. Legacy display fields remain for existing screens/history. |

`getServiceCatalog` seeds versioned reference documents without deleting existing records. `updateTechnicianQualifications` and `createServiceRequest` validate all IDs server-side; request creation verifies that the selected animal record belongs to the farmer and matches its animal type and approved breed. `syncPublicProfile` maintains the safe projection. Backfill existing profiles after deployment in PowerShell with `$env:GCLOUD_PROJECT='<project-id>'; node functions/scripts/backfill-public-profiles.js`. The request discovery index covers `users(role,status,qualificationKeys)`, `publicProfiles(role,status)`, and appointment lookups by `status` with `eligibleTechnicianIds` or `technicianId`; definitions are in `firestore.indexes.json`.

#### Production rollout (PowerShell)

The Firebase project must use the Blaze plan. Set `RESEND_API_KEY` and `REGISTRATION_OTP_SECRET` through Firebase Secret Manager; never commit their values. Deploy indexes and wait until they are ready, then deploy Functions, backfill existing safe profiles, and finally deploy the rules before releasing the updated app:

```powershell
$projectId = 'agecare-ca137'
firebase functions:secrets:set RESEND_API_KEY --project $projectId
firebase functions:secrets:set REGISTRATION_OTP_SECRET --project $projectId
firebase deploy --only firestore:indexes --project $projectId
firebase deploy --only functions --project $projectId
gcloud auth application-default login
$env:GCLOUD_PROJECT = $projectId
node functions/scripts/backfill-public-profiles.js
firebase deploy --only firestore:rules --project $projectId
```

The account used for Application Default Credentials needs Firestore read/write access. Keep Firestore rules deployment after the backfill because the client reads cross-user display data from `publicProfiles` once the new rules are active.

Authenticated HTTPS Cloud Functions also expose `getServiceCatalog`, `updateTechnicianQualifications`, `getEligibleTechnicians`, `createServiceRequest`, `acceptServiceRequest`, `sendPushNotification`, `submitTechnicianRating`, and `migrateLegacyUserProfile`. Request expiry republishes direct requests only to qualified and available technicians. Existing technician documents receive empty qualification arrays and `qualificationVerified: false`; no service permissions are inferred from legacy free-text expertise.

`firestore.rules` limits private user documents to their owner and admins, serves safe profile projections to signed-in users, denies client-side request creation, and restricts request reads/updates to the farmer, an eligible technician, the assigned legacy technician, or an admin. Admin assignment updates also require an active, verified technician with the exact animal/service qualification. Server Functions perform service request creation, qualification updates, acceptance, rating aggregation, push sends, and request notifications. Rules and Functions are source changes only; they must be deployed to take effect. The current deployed Firestore release was observed with unrestricted `read, write: if true`, so production data and workflow are not protected until the new release is deployed.

Workflow checks: `npm test --prefix functions`, `npm run test:rules --prefix functions`, and `npm run test:api --prefix functions` (the emulator checks require JDK 21+ and the declared Functions dependencies).
