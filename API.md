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
