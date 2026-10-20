# 📊 AgriCare — System Flowchart

> Mga pangunahing daloy (flow) ng buong AgriCare system mula registration hanggang sa service completion.

---

## 1. Registration & Authentication Flow

```mermaid
flowchart TD
    A[User Opens App] --> B{May Account Na?}
    B -->|Oo| C[Login Screen]
    B -->|Wala| D[Register Screen]
    
    C --> E[Enter Email & Password]
    E --> F[Firebase Auth Login]
    F --> G{Login Successful?}
    G -->|Hindi| H[Show Error Message]
    H --> C
    G -->|Oo| I[Check User Status]
    
    I --> J{Status?}
    J -->|pending| K[Pending Verification Screen]
    J -->|rejected| L[Rejected Screen]
    J -->|banned| M[Banned Notice]
    J -->|active| N{Role?}
    
    N -->|admin| O[Admin Dashboard]
    N -->|farmer| P[Farmer Home]
    N -->|technician| Q[Technician Dashboard]
    
    D --> R[Fill Registration Form]
    R --> S[Select Role: Farmer/Technician]
    S --> T[Capture Valid ID]
    T --> U[Upload to Supabase Storage]
    U --> V[Create Firebase Auth Account]
    V --> W[Create Firestore User Doc - status: pending]
    W --> X[Create Role Profile Doc]
    X --> Y[Notify Admin]
    Y --> K
```

---

## 2. Admin Verification Flow

```mermaid
flowchart TD
    A[Admin Receives Notification] --> B[Open User Management]
    B --> C[View Pending Users]
    C --> D[Review User Details & ID]
    
    D --> E{Decision?}
    E -->|Approve| F[Update users.status = active]
    F --> G[Send FCM Push to User]
    G --> H[Log Action - logs collection]
    
    E -->|Reject| I[Update users.status = rejected]
    I --> J[Add Rejection Reason]
    J --> K[Send FCM Push to User]
    K --> H
    
    E -->|Ban| L[Update users.status = banned]
    L --> M[Set banExpiry & banReason]
    M --> N[Create chatBans Record]
    N --> H
```

---

## 3. Appointment Booking Flow (Farmer)

```mermaid
flowchart TD
    A[Farmer Opens Services Tab] --> B[Select Service Type]
    B --> C[Select Animal]
    C --> D[Search Nearby Technicians on Map]
    D --> E[View Technician Profile]
    E --> F[Select Preferred Technician]
    F --> G[Choose Date & Time]
    G --> H[Add Description/Notes]
    H --> I[Submit Appointment Request]
    
    I --> J[Create appointments doc - status: pending]
    J --> K[Send Notification to Technician]
    K --> L[Wait for Technician Response]
    
    L --> M{Technician Decision?}
    M -->|Accept| N[Update status = upcoming]
    N --> O[Auto-create Chat Room in RTDB]
    O --> P[Create Calendar Event]
    P --> Q[Send FCM Push to Farmer]
    Q --> R[Both Can Chat]
    
    M -->|Decline| S[Update status = declined]
    S --> T[Notify Farmer]
    T --> U[Farmer Can Rebook]
```

---

## 4. Emergency Request Flow

```mermaid
flowchart TD
    A[Farmer Detects Emergency] --> B[Open Emergency Button]
    B --> C[Select Animal]
    C --> D[Describe Emergency]
    D --> E[Auto-capture GPS Location]
    E --> F[Submit Emergency Request]
    
    F --> G[Create emergencyRequests doc - status: pending]
    G --> H[Notify All Available Technicians in Area]
    
    H --> I{Technician Responds?}
    I -->|Oo| J[Update respondedBy & status = responded]
    J --> K[Auto-create Chat Room]
    K --> L[Notify Farmer - Help is Coming]
    L --> M[Technician Travels to Location]
    M --> N[Service Completed]
    N --> O[Update status = resolved]
    O --> P[Create Health Record]
    
    I -->|Walang Response| Q[Escalate - Notify Admin]
```

---

## 5. Health Record & Follow-up Flow

```mermaid
flowchart TD
    A[Technician Completes Visit] --> B[Open Health Record Form]
    B --> C[Enter Diagnosis & Symptoms]
    C --> D[Enter Treatment & Medication]
    D --> E[Record Weight & Temperature]
    E --> F{Requires Follow-up?}
    
    F -->|Oo| G[Set Follow-up Type & Interval]
    G --> H[Create healthReminders doc]
    H --> I[Schedule Push Notification]
    I --> J[Save Health Record]
    
    F -->|Hindi| J
    
    J --> K[Create healthRecords doc]
    K --> L[Update Animal Health Status]
    L --> M[Notify Farmer via Chat]
    M --> N[Send FCM Push to Farmer]
    
    N --> O{Reminder Due?}
    O -->|Oo| P[Send Follow-up Notification]
    P --> Q[Farmer Rebooks or Confirms]
```

---

## 6. Chat & Messaging Flow

```mermaid
flowchart TD
    A[Appointment Accepted] --> B[Auto-create Chat Room in RTDB]
    B --> C[Both Users See Chat in Messages Tab]
    
    C --> D[User Opens Chat]
    D --> E[Load Messages from RTDB]
    E --> F[Set typing/ indicator on type]
    
    F --> G[Send Message]
    G --> H[Write to messages/{chatId}/{msgId}]
    H --> I[Update chats/{chatId}/lastMessage]
    I --> J[Increment unreadCount for recipient]
    J --> K[Trigger FCM Push via Supabase Edge Function]
    
    K --> L{Recipient Online?}
    L -->|Oo| M[Real-time listener updates UI]
    L -->|Hindi| N[OS Push Notification]
    
    D --> O[Read Messages]
    O --> P[Reset unreadCount to 0]
    P --> Q[Mark messages as read]
```

---

## 7. Rating & Review Flow

```mermaid
flowchart TD
    A[Appointment Completed] --> B[Technician Sends Rate Request]
    B --> C[Create rateRequests doc - status: pending]
    C --> D[Notify Farmer - Please Rate]
    
    D --> E[Farmer Opens Rating Form]
    E --> F[Select Star Rating 1-5]
    F --> G[Add Optional Comment]
    G --> H[Submit Review]
    
    H --> I[Create reviews doc]
    I --> J[Recalculate technician.rating]
    J --> K[Increment technician.reviewCount]
    K --> L[Update rateRequests.status = completed]
    L --> M[Notify Technician of New Rating]
```

---

## 8. Community Forum Flow

```mermaid
flowchart TD
    A[User Opens Forum] --> B[View Posts by Category]
    B --> C{Action?}
    
    C -->|Create Post| D[Fill Title & Content]
    D --> E[Select Category]
    E --> F[Create communityForum doc]
    F --> G[Post Visible to All Users]
    
    C -->|Reply| H[Open Post]
    H --> I[Write Reply]
    I --> J[Create replies subcollection doc]
    J --> K[Increment post.replies count]
    
    C -->|Like| L[Increment post.likes]
    
    C -->|Report| M[Create reports doc]
    M --> N[Notify Admin for Moderation]
```

---

## 9. Overall System Flow (High-Level)

```mermaid
flowchart LR
    subgraph FARMER["🧑‍🌾 Farmer"]
        F1[Register] --> F2[Book Service]
        F2 --> F3[Chat]
        F3 --> F4[Rate Technician]
    end
    
    subgraph ADMIN["👨‍💼 Admin"]
        A1[Verify Users] --> A2[Manage Content]
        A2 --> A3[Monitor System]
        A3 --> A4[Moderate Forum]
    end
    
    subgraph TECHNICIAN["👨‍⚕️ Technician"]
        T1[Register & Verify] --> T2[Accept Appointments]
        T2 --> T3[Visit & Treat]
        T3 --> T4[Record Health Data]
    end
    
    subgraph FIREBASE["☁️ Firebase Backend"]
        FB1[Auth]
        FB2[Firestore]
        FB3[RTDB - Chat]
        FB4[FCM - Push]
    end
    
    subgraph SUPABASE["🗂️ Supabase"]
        S1[Storage - Photos/IDs]
        S2[Edge Functions - Push]
    end
    
    FARMER --> FIREBASE
    TECHNICIAN --> FIREBASE
    ADMIN --> FIREBASE
    FIREBASE --> SUPABASE
```
