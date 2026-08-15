# 🗄️ DATABASE.md — AgriCare Database Diagram

> **Last Updated**: August 15, 2026 **Backend**: Firebase (Firestore + Realtime Database) **Project ID**: agecare-ca137

---

## 📊 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FIREBASE FIRESTORE                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│       users          │         │       admin          │
├──────────────────────┤         ├──────────────────────┤
│ id (PK)              │◄───┐    │ id (PK)              │
│ email                │    │    │ userId (FK → users)   │────┐
│ displayName          │    │    │ permissions[]         │    │
│ role                 │    │    │ managedCategories[]   │    │
│ phoneNumber          │    │    │ dashboardAccess       │    │
│ status               │    │    │ superAdmin            │    │
│ photoURL             │    │    └──────────────────────┘    │
│ fcmToken             │    │                                │
│ banExpiry            │    │    ┌──────────────────────┐    │
│ banReason            │    │    │      farmer          │    │
│ createdAt            │    ├────┤ id (PK)              │    │
│ updatedAt            │    │    │ userId (FK → users)   │────┤
└──────────────────────┘    │    │ location             │    │
         ▲                  │    │ barangay             │    │
         │                  │    │ latitude             │    │
         │                  │    │ longitude            │    │
         │                  │    │ totalAnimals         │    │
         │                  │    │ favoriteTechnicians[]│    │
         │                  │    │ animals[]            │    │
         │                  │    └──────────────────────┘    │
         │                  │                                │
         │                  │    ┌──────────────────────┐    │
         │                  │    │    technician        │    │
         │                  └────┤ id (PK)              │    │
         │                       │ userId (FK → users)   │────┘
         │                       │ name                 │
         │                       │ rating               │
         │                       │ reviewCount          │
         │                       │ specializations[]    │
         │                       │ experience           │
         │                       │ serviceArea          │
         │                       │ latitude             │
         │                       │ longitude            │
         │                       │ available            │
         │                       │ verificationStatus   │
         │                       │ verifiedAt           │
         │                       │ bio                  │
         │                       │ completedAppointments│
         │                       │ documents[]          │
         │                       └──────────────────────┘
         │
         │
    ┌────┴────────────────────────────────────────────────────────────────┐
    │                        SHARED COLLECTIONS                            │
    └──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐        ┌──────────────────────────┐
│       animals            │        │     appointments         │
├──────────────────────────┤        ├──────────────────────────┤
│ id (PK)                  │◄──┐    │ id (PK)                  │
│ name                     │   │    │ serviceType              │
│ type                     │   │    │ animalId (FK → animals)  │────┐
│ breed                    │   │    │ animalName               │    │
│ age                      │   │    │ farmerId (FK → users)    │    │
│ weight                   │   │    │ farmerName               │    │
│ healthStatus             │   │    │ technicianId (FK → users)│    │
│ ownerId (FK → users)     │   │    │ technicianName           │    │
│ gender                   │   │    │ date                     │    │
│ imageUrl                 │   │    │ time                     │    │
│ vaccinationUpToDate      │   │    │ status                   │    │
│ lastCheckup              │   │    │ description              │    │
│ createdAt                │   │    │ location                 │    │
│ updatedAt                │   │    │ createdAt                │    │
└──────────────────────────┘   │    │ updatedAt                │    │
                               │    └──────────────────────────┘    │
                               │                                    │
┌──────────────────────────┐   │    ┌──────────────────────────┐    │
│     healthRecords        │   │    │     consultations         │    │
├──────────────────────────┤   │    ├──────────────────────────┤    │
│ id (PK)                  │   │    │ id (PK)                  │    │
│ animalId (FK → animals)  │───┘    │ farmerId (FK → users)    │    │
│ animalName               │        │ farmerName               │    │
│ recordType               │        │ technicianId (FK → users)│    │
│ date                     │        │ technicianName           │    │
│ diagnosis                │        │ animalId (FK → animals)  │────┘
│ symptoms[]               │        │ subject                  │
│ treatment                │        │ status                   │
│ medication               │        │ notes                    │
│ dosage                   │        │ createdAt                │
│ weight                   │        │ resolvedAt               │
│ temperature              │        └──────────────────────────┘
│ technicianId (FK → users)│
│ technicianName           │        ┌──────────────────────────┐
│ requiresFollowUp         │        │    emergencyRequests     │
│ followUpType             │        ├──────────────────────────┤
│ followUpInterval         │        │ id (PK)                  │
│ nextFollowUp             │        │ farmerId (FK → users)    │
│ notes                    │        │ farmerName               │
│ status                   │        │ animalId (FK → animals)  │
│ attachments[]            │        │ description              │
│ vaccineType              │        │ location                 │
│ vaccineBatch             │        │ latitude                 │
│ farmerId (FK → users)    │        │ longitude                │
│ farmerName               │        │ status                   │
│ createdAt                │        │ respondedBy (FK → users) │
│ updatedAt                │        │ respondedAt              │
└──────────────────────────┘        │ createdAt                │
                                    └──────────────────────────┘
┌──────────────────────────┐
│     healthReminders      │        ┌──────────────────────────┐
├──────────────────────────┤        │       reviews            │
│ id (PK)                  │        ├──────────────────────────┤
│ healthRecordId (FK)      │        │ id (PK)                  │
│ animalId (FK → animals)  │        │ technicianId (FK → users)│
│ animalName               │        │ technicianName           │
│ farmerId (FK → users)    │        │ farmerId (FK → users)    │
│ farmerName               │        │ farmerName               │
│ technicianId (FK → users)│        │ rating                   │
│ technicianName           │        │ comment                  │
│ reminderType             │        │ appointmentId (FK)       │
│ title                    │        │ createdAt                │
│ description              │        └──────────────────────────┘
│ scheduledDate            │
│ priority                 │        ┌──────────────────────────┐
│ status                   │        │     rateRequests         │
│ notificationSent         │        ├──────────────────────────┤
│ reminderBefore           │        │ id (PK)                  │
│ createdAt                │        │ technicianId (FK → users)│
│ updatedAt                │        │ farmerId (FK → users)    │
└──────────────────────────┘        │ appointmentId (FK)       │
                                    │ animalId (FK → animals)  │
                                    │ animalName               │
                                    │ animalPhoto              │
                                    │ status                   │
                                    │ createdAt                │
                                    └──────────────────────────┘

┌──────────────────────────┐        ┌──────────────────────────┐
│     knowledgeBase        │        │    communityForum        │
├──────────────────────────┤        ├──────────────────────────┤
│ id (PK)                  │        │ id (PK)                  │
│ title                    │        │ authorId (FK → users)    │
│ category                 │        │ authorName               │
│ content                  │        │ authorRole               │
│ authorId (FK → users)    │        │ title                    │
│ authorName               │        │ content                  │
│ authorRole               │        │ category                 │
│ tags[]                   │        │ likes                    │
│ views                    │        │ replies                  │
│ createdAt                │        │ views                    │
│ updatedAt                │        │ status                   │
└──────────────────────────┘        │ createdAt                │
                                    │ updatedAt                │
┌──────────────────────────┐        └──────────────────────────┘
│    livestockCategories   │                  │
├──────────────────────────┤                  │ (subcollection)
│ id (PK)                  │                  ▼
│ name                     │        ┌──────────────────────────┐
│ type                     │        │       replies            │
│ breeds[]                 │        ├──────────────────────────┤
│ icon                     │        │ id (PK)                  │
│ createdAt                │        │ postId (FK → forum)      │
│ updatedAt                │        │ authorId (FK → users)    │
└──────────────────────────┘        │ authorName               │
                                    │ authorRole               │
┌──────────────────────────┐        │ content                  │
│     announcements        │        │ likes                    │
├──────────────────────────┤        │ createdAt                │
│ id (PK)                  │        └──────────────────────────┘
│ title                    │
│ content                  │
│ audience                 │        ┌──────────────────────────┐
│ priority                 │        │       reports            │
│ createdBy (FK → users)   │        ├──────────────────────────┤
│ createdAt                │        │ id (PK)                  │
│ updatedAt                │        │ reporterId (FK → users)  │
└──────────────────────────┘        │ reporterName             │
                                    │ reporterRole             │
┌──────────────────────────┐        │ reportedUserId (FK)      │
│     notifications        │        │ reportedUserName         │
├──────────────────────────┤        │ messageText              │
│ id (PK)                  │        │ chatId                   │
│ userId (FK → users)      │        │ reason                   │
│ type                     │        │ status                   │
│ title                    │        │ resolvedBy (FK → users)  │
│ body                     │        │ resolvedAt               │
│ read                     │        │ createdAt                │
│ data {}                  │        └──────────────────────────┘
│ createdAt                │
└──────────────────────────┘        ┌──────────────────────────┐
                                    │     chatBans             │
┌──────────────────────────┐        ├──────────────────────────┤
│   customServices         │        │ id (PK)                  │
├──────────────────────────┤        │ userId (FK → users)      │
│ id (PK)                  │        │ bannedBy (FK → users)    │
│ farmerId (FK → users)    │        │ duration                 │
│ farmerName               │        │ reason                   │
│ animalId (FK → animals)  │        │ expiresAt                │
│ animalName               │        │ createdAt                │
│ serviceType              │        └──────────────────────────┘
│ icon                     │
│ description              │        ┌──────────────────────────┐
│ technicianId (FK → users)│        │  favoriteTechnicians     │
│ status                   │        ├──────────────────────────┤
│ createdAt                │        │ id (PK)                  │
│ updatedAt                │        │ farmerId (FK → users)    │
└──────────────────────────┘        │ technicianId (FK → users)│
                                    │ createdAt                │
┌──────────────────────────┐        └──────────────────────────┘
│        logs              │
├──────────────────────────┤        ┌──────────────────────────┐
│ id (PK)                  │        │     appVersion           │
│ action                   │        ├──────────────────────────┤
│ userId (FK → users)      │        │ id (PK)                  │
│ userName                 │        │ latestVersion            │
│ userRole                 │        │ forceUpdate              │
│ targetType               │        │ storeUrl                 │
│ targetId                 │        │ updatedAt                │
│ details                  │        └──────────────────────────┘
│ createdAt                │
└──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          FIREBASE REALTIME DATABASE                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐        ┌──────────────────────────┐
│     chats/               │        │     messages/            │
├──────────────────────────┤        ├──────────────────────────┤
│ {chatId}                 │        │ {chatId}/                │
│   ├─ participants[]      │        │   ├─ {messageId}         │
│   ├─ participantNames{}  │        │   │   ├─ senderId        │
│   ├─ lastMessage         │        │   │   ├─ text            │
│   ├─ lastMessageTime     │        │   │   ├─ timestamp       │
│   ├─ lastSenderId        │        │   │   ├─ read            │
│   └─ unreadCount{}       │        │   │   ├─ replyTo{}       │
└──────────────────────────┘        │   │   └─ reactions{}     │
                                    │   └─ ...                 │
┌──────────────────────────┐        └──────────────────────────┘
│     typing/              │
├──────────────────────────┤        ┌──────────────────────────┐
│ {chatId}/                │        │   onlineStatus/          │
│   └─ {userId}: boolean   │        ├──────────────────────────┤
└──────────────────────────┘        │ {userId}                 │
                                    │   ├─ online: boolean     │
┌──────────────────────────┐        │   └─ lastSeen: timestamp│
│   locations/             │        └──────────────────────────┘
├──────────────────────────┤
│ {userId}                 │
│   ├─ latitude            │
│   ├─ longitude           │
│   ├─ timestamp           │
│   └─ heading             │
└──────────────────────────┘

```

---

## 🔗 Relationships Summary

| From | To | Relationship | Type |
| --- | --- | --- | --- |
| `admin` | `users` | userId → users.id | 1:1 |
| `farmer` | `users` | userId → users.id | 1:1 |
| `technician` | `users` | userId → users.id | 1:1 |
| `animals` | `users` | ownerId → users.id (farmer) | N:1 |
| `appointments` | `users` | farmerId → users.id | N:1 |
| `appointments` | `users` | technicianId → users.id | N:1 |
| `appointments` | `animals` | animalId → animals.id | N:1 |
| `healthRecords` | `animals` | animalId → animals.id | N:1 |
| `healthRecords` | `users` | technicianId → users.id | N:1 |
| `healthRecords` | `users` | farmerId → users.id | N:1 |
| `healthReminders` | `healthRecords` | healthRecordId → healthRecords.id | N:1 |
| `consultations` | `users` | farmerId → users.id | N:1 |
| `consultations` | `users` | technicianId → users.id | N:1 |
| `emergencyRequests` | `users` | farmerId → users.id | N:1 |
| `emergencyRequests` | `users` | respondedBy → users.id | N:1 |
| `reviews` | `users` | technicianId → users.id | N:1 |
| `reviews` | `users` | farmerId → users.id | N:1 |
| `rateRequests` | `users` | technicianId → users.id | N:1 |
| `rateRequests` | `users` | farmerId → users.id | N:1 |
| `notifications` | `users` | userId → users.id | N:1 |
| `reports` | `users` | reporterId → users.id | N:1 |
| `knowledgeBase` | `users` | authorId → users.id | N:1 |
| `communityForum` | `users` | authorId → users.id | N:1 |
| `replies` | `communityForum` | postId → forum.id | N:1 |
| `announcements` | `users` | createdBy → users.id | N:1 |
| `logs` | `users` | userId → users.id | N:1 |
| `customServices` | `users` | farmerId → users.id | N:1 |
| `chatBans` | `users` | userId → users.id | N:1 |
| `favoriteTechnicians` | `users` | farmerId + technicianId → users.id | N:N |

---

## 📋 Collection Summary

### 🔐 Core (Role-Based)

| Collection | Count | Description |
| --- | --- | --- |
| `users` | — | All user accounts (shared auth data) |
| `admin` | — | Admin-specific profile data |
| `farmer` | — | Farmer-specific profile (location, animals) |
| `technician` | — | Technician profile (specializations, rating) |

### 🐄 Livestock

| Collection | Count | Description |
| --- | --- | --- |
| `animals` | — | Registered livestock (owned by farmers) |
| `livestockCategories` | 7 | Animal types + breeds |
| `healthRecords` | — | Medical records per animal |
| `healthReminders` | — | Follow-up scheduling |

### 📅 Services

| Collection | Count | Description |
| --- | --- | --- |
| `appointments` | — | Service bookings (farmer ↔ technician) |
| `consultations` | — | Active consultation threads |
| `emergencyRequests` | — | Urgent help requests |
| `customServices` | — | Custom/emergency service requests |

### 💬 Communication

| Collection | Count | Description |
| --- | --- | --- |
| `notifications` | — | In-app notification feed |
| `announcements` | — | Admin broadcasts |
| `knowledgeBase` | — | Educational articles |
| `communityForum` | — | Discussion posts |
| `replies` | — | Forum post replies (subcollection) |

### ⭐ Rating & Reports

| Collection | Count | Description |
| --- | --- | --- |
| `reviews` | — | Farmer ratings of technicians |
| `rateRequests` | — | Pending rating requests |
| `reports` | — | Chat message reports |
| `chatBans` | — | Active chat bans |

### 📊 System

| Collection | Count | Description |
| --- | --- | --- |
| `logs` | — | Activity audit trail |
| `appVersion` | 1 | App version control |
| `favoriteTechnicians` | — | Farmer ↔ Technician favorites |

### ⚡ Realtime Database (RTDB)

| Path | Description |
| --- | --- |
| `chats/{chatId}` | Chat room metadata (participants, last message) |
| `messages/{chatId}/{msgId}` | Individual messages (text, reactions, replies) |
| `typing/{chatId}/{userId}` | Typing indicators |
| `onlineStatus/{userId}` | Online/offline + last seen |
| `locations/{userId}` | GPS coordinates for map tracking |

---

## 🔑 Status Enums

| Field | Values |
| --- | --- |
| `users.status` | `pending`, `active`, `banned`, `deactivated`, `rejected` |
| `technician.verificationStatus` | `pending`, `verified`, `rejected` |
| `appointments.status` | `pending`, `upcoming`, `completed`, `cancelled`, `declined` |
| `healthRecords.status` | `resolved`, `ongoing`, `monitoring` |
| `healthRecords.recordType` | `checkup`, `vaccination`, `treatment`, `surgery`, `deworming`, `lab_test`, `emergency`, `follow_up` |
| `healthReminders.reminderType` | `follow_up`, `vaccination_due`, `deworming_due`, `treatment_check`, `routine_checkup` |
| `healthReminders.priority` | `low`, `medium`, `high`, `critical` |
| `healthReminders.status` | `pending`, `sent`, `completed`, `overdue` |
| `emergencyRequests.status` | `pending`, `responded`, `resolved` |
| `reports.status` | `pending`, `resolved`, `dismissed` |
| `rateRequests.status` | `pending`, `completed` |
| `consultations.status` | `active`, `resolved` |
| `announcements.audience` | `all`, `farmers`, `technicians` |
| `announcements.priority` | `low`, `medium`, `high` |
| `animals.healthStatus` | `healthy`, `sick`, `under_treatment`, `deceased` |

---

## 🗺️ Data Flow

```
FARMER registers → users (status: pending)
                → farmer profile created
                → Admin notified

ADMIN approves → users.status = 'active'
              → FCM notification to farmer

FARMER books appointment → appointments (status: pending)
                        → Notification to technician

TECHNICIAN accepts → appointment.status = 'upcoming'
                  → Auto-create chat room (RTDB)
                  → Send chat message
                  → Create device calendar event
                  → FCM push to farmer

TECHNICIAN visits → healthRecords created
                 → healthReminders (if follow-up)
                 → Chat summary sent
                 → FCM notification to farmer

TECHNICIAN sends rate request → rateRequests (status: pending)
FARMER rates → reviews created
            → technician.rating recalculated
            → rateRequests.status = 'completed'

```

---

## 📂 Firebase Config

```
Project ID:     agecare-ca137
Storage Bucket: agecare-ca137.firebasestorage.app
Android Package: com.kennethgimpao22.AgriCare

```

### Storage Buckets (Supabase)

| Bucket | Purpose |
| --- | --- |
| `farmer_profile_photo` | Farmer selfies |
| `technician_profile_photo` | Technician selfies |
| `farmers_proof` | Farmer valid IDs |
| `technician_proof` | Technician licenses/certificates |
| `animals` | Animal photos |

