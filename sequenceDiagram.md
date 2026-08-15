# 🔄 AgriCare — Sequence Diagrams

> Mga detalyadong interaction sequences ng AgriCare system — sino ang nag-uusap sa sino at kailan.

---

## 1. Registration & Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor F as Farmer/Technician
    participant App as AgriCare App
    participant Auth as Firebase Auth
    participant FS as Firestore
    participant SB as Supabase Storage
    participant FCM as FCM Push
    actor A as Admin

    F->>App: Open Register Screen
    F->>App: Fill form (name, email, password, role)
    F->>App: Capture Valid ID photo
    App->>SB: Upload ID photo
    SB-->>App: Public URL returned
    App->>Auth: createUserWithEmailAndPassword()
    Auth-->>App: User UID
    App->>FS: Create /users/{uid} (status: pending)
    App->>FS: Create /farmer/{uid} or /technician/{uid}
    App->>FCM: Register device FCM token
    App->>FS: Create /notifications for admin
    FS-->>A: Real-time listener triggers
    App-->>F: Show "Pending Verification" screen

    Note over A: Admin reviews application
    A->>App: Open User Management
    A->>FS: Read user doc + verification docs
    FS-->>A: User data + ID photo URL

    alt Approved
        A->>FS: Update users.status = "active"
        A->>FS: Update technician.verificationStatus = "verified"
        A->>FS: Create /logs entry (action: approve)
        FS->>FCM: Trigger push notification
        FCM-->>F: "Your account has been approved!"
        F->>App: Login → Role-based Dashboard
    else Rejected
        A->>FS: Update users.status = "rejected"
        A->>FS: Create /logs entry (action: reject)
        FS->>FCM: Trigger push notification
        FCM-->>F: "Registration rejected. Reason: ..."
        F->>App: Show Rejected screen
    end
```

---

## 2. Appointment Booking Sequence

```mermaid
sequenceDiagram
    autonumber
    actor F as Farmer
    participant App as AgriCare App
    participant FS as Firestore
    participant RTDB as Realtime DB
    participant FCM as FCM Push
    participant Edge as Supabase Edge Fn
    actor T as Technician

    F->>App: Open Services Tab
    F->>App: Select Service Type
    F->>App: Select Animal from list
    F->>App: Browse Map for Technicians
    App->>FS: Query technicians (available=true, nearby)
    FS-->>App: List of available technicians
    F->>App: Select Technician
    F->>App: Pick Date & Time
    F->>App: Add description
    F->>App: Submit Booking

    App->>FS: Create /appointments (status: pending)
    App->>FS: Create /notifications for technician
    App->>Edge: Call send-push Edge Function
    Edge->>FCM: Send push to technician
    FCM-->>T: "New appointment request from [Farmer]"

    T->>App: Open Appointment Request
    T->>App: View details (animal, service, date)

    alt Accepted
        T->>FS: Update appointment.status = "upcoming"
        T->>RTDB: Create /chats/{chatId}
        T->>FS: Create /notifications for farmer
        FS->>Edge: Trigger push
        Edge->>FCM: Send push to farmer
        FCM-->>F: "Appointment accepted by [Tech]!"
        Note over F,T: Both can now chat in real-time
    else Declined
        T->>FS: Update appointment.status = "declined"
        T->>FS: Create /notifications for farmer
        FS->>Edge: Trigger push
        Edge->>FCM: Send push to farmer
        FCM-->>F: "Appointment declined. Please rebook."
    end
```

---

## 3. Real-time Chat Sequence

```mermaid
sequenceDiagram
    autonumber
    actor F as Farmer
    participant AppF as Farmer App
    participant RTDB as Realtime Database
    participant Edge as Supabase Edge Fn
    participant FCM as FCM Push
    participant AppT as Technician App
    actor T as Technician

    Note over F,T: Chat room created after appointment acceptance

    F->>AppF: Open Messages Tab
    AppF->>RTDB: Subscribe to /chats/{chatId}
    AppF->>RTDB: Subscribe to /messages/{chatId}
    RTDB-->>AppF: Load existing messages

    F->>AppF: Start typing
    AppF->>RTDB: Set /typing/{chatId}/{farmerId} = true
    RTDB-->>AppT: Typing indicator update
    AppT-->>T: Show "Farmer is typing..."

    F->>AppF: Send message
    AppF->>RTDB: Write /messages/{chatId}/{msgId}
    AppF->>RTDB: Update /chats/{chatId}/lastMessage
    AppF->>RTDB: Increment unreadCount for technician
    AppF->>RTDB: Clear /typing/{chatId}/{farmerId}

    RTDB-->>AppT: Real-time message listener fires

    alt Technician Online
        AppT-->>T: Display new message in chat
        T->>AppT: Open chat
        AppT->>RTDB: Reset unreadCount to 0
    else Technician Offline
        RTDB->>Edge: Trigger send-push function
        Edge->>FCM: Send push notification
        FCM-->>T: "New message from [Farmer]: ..."
        T->>AppT: Tap notification → Open chat
        AppT->>RTDB: Load messages + reset unreadCount
    end

    T->>AppT: Reply message
    AppT->>RTDB: Write /messages/{chatId}/{msgId}
    RTDB-->>AppF: Real-time update
    AppF-->>F: Display reply
```

---

## 4. Emergency Request Sequence

```mermaid
sequenceDiagram
    autonumber
    actor F as Farmer
    participant App as AgriCare App
    participant GPS as Location Service
    participant FS as Firestore
    participant Edge as Supabase Edge Fn
    participant FCM as FCM Push
    actor T1 as Technician 1
    actor T2 as Technician 2
    actor A as Admin

    F->>App: Tap Emergency Button
    F->>App: Select affected animal
    F->>App: Describe emergency
    App->>GPS: Get current GPS coordinates
    GPS-->>App: {latitude, longitude}
    F->>App: Submit emergency request

    App->>FS: Create /emergencyRequests (status: pending)
    App->>FS: Query available technicians in radius
    FS-->>App: List of nearby available technicians

    par Notify All Nearby Technicians
        App->>Edge: Send push to Technician 1
        Edge->>FCM: Push notification
        FCM-->>T1: "🚨 Emergency request nearby!"
    and
        App->>Edge: Send push to Technician 2
        Edge->>FCM: Push notification
        FCM-->>T2: "🚨 Emergency request nearby!"
    end

    alt Technician 1 Responds First
        T1->>App: Accept emergency
        App->>FS: Update respondedBy = T1.id
        App->>FS: Update status = "responded"
        App->>FS: Create /chats for F ↔ T1
        App->>Edge: Notify Farmer
        Edge->>FCM: Push to Farmer
        FCM-->>F: "Help is on the way! [Tech 1] responded."
        Note over F,T1: Real-time chat begins
        T1->>App: Navigate to farmer location
        T1->>App: Complete service
        T1->>FS: Update status = "resolved"
        T1->>FS: Create health record
    else No Response (30 min timeout)
        App->>FS: Escalate to Admin
        App->>Edge: Notify Admin
        Edge->>FCM: Push to Admin
        FCM-->>A: "⚠️ Unresolved emergency - please intervene"
        A->>App: Manually assign technician
    end
```

---

## 5. Health Record & Follow-up Sequence

```mermaid
sequenceDiagram
    autonumber
    actor T as Technician
    participant App as AgriCare App
    participant FS as Firestore
    participant FCM as FCM Push
    actor F as Farmer

    Note over T: After appointment/emergency visit

    T->>App: Open Health Record Form
    T->>App: Enter diagnosis & symptoms
    T->>App: Enter treatment & medication
    T->>App: Record weight & temperature
    T->>App: Add notes

    alt Requires Follow-up
        T->>App: Toggle "Requires Follow-up"
        T->>App: Select follow-up type
        T->>App: Set follow-up interval (days)
        T->>App: Save health record

        App->>FS: Create /healthRecords doc
        App->>FS: Create /healthReminders doc (dueDate calculated)
        App->>FS: Update animal healthStatus
        App->>FS: Update appointment status = "completed"
    else No Follow-up
        T->>App: Save health record
        App->>FS: Create /healthRecords doc
        App->>FS: Update animal healthStatus
        App->>FS: Update appointment status = "completed"
    end

    App->>FCM: Notify Farmer
    FCM-->>F: "Health record added for [Animal]"
    F->>App: View health record in animal profile

    Note over FS: When reminder dueDate arrives...
    FS->>FCM: Scheduled push notification
    FCM-->>F: "🔔 Follow-up due for [Animal] - [Type]"
    F->>App: Book follow-up appointment or confirm
```

---

## 6. Rating & Review Sequence

```mermaid
sequenceDiagram
    autonumber
    actor T as Technician
    participant AppT as Tech App
    participant FS as Firestore
    participant FCM as FCM Push
    participant AppF as Farmer App
    actor F as Farmer

    Note over T: After completing appointment

    T->>AppT: Tap "Request Rating"
    AppT->>FS: Create /rateRequests (status: pending)
    AppT->>FS: Create /notifications for farmer
    FS->>FCM: Trigger push
    FCM-->>F: "Please rate your experience with [Tech]"

    F->>AppF: Open rating form
    F->>AppF: Select stars (1-5)
    F->>AppF: Write optional comment
    F->>AppF: Submit review

    AppF->>FS: Create /reviews doc
    AppF->>FS: Update /rateRequests status = "completed"
    AppF->>FS: Recalculate technician.rating (average)
    AppF->>FS: Increment technician.reviewCount
    AppF->>FS: Create /notifications for technician
    FS->>FCM: Trigger push
    FCM-->>T: "New rating received: ⭐⭐⭐⭐⭐"
    T->>AppT: View rating in profile
```

---

## 7. Admin Moderation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor U as Any User
    participant App as AgriCare App
    participant FS as Firestore
    participant FCM as FCM Push
    actor A as Admin

    U->>App: Report post/user (inappropriate content)
    App->>FS: Create /reports doc (status: pending)
    App->>FS: Create /notifications for admin
    FS->>FCM: Push to admin
    FCM-->>A: "New report submitted"

    A->>App: Open Reports Module
    A->>FS: Query reports (status: pending)
    FS-->>A: List of pending reports
    A->>App: View report details + target content

    alt Take Action (Ban)
        A->>FS: Update target user status = "banned"
        A->>FS: Set banExpiry & banReason
        A->>FS: Create /chatBans record
        A->>FS: Update report status = "resolved"
        A->>FS: Create /logs entry
        FS->>FCM: Notify reported user
        FCM-->>U: "Your account has been suspended"
    else Dismiss Report
        A->>FS: Update report status = "dismissed"
        A->>FS: Create /logs entry
    else Remove Content Only
        A->>FS: Delete offending forum post
        A->>FS: Update report status = "resolved"
        A->>FS: Create /logs entry
        FS->>FCM: Notify content author
        FCM-->>U: "Your post was removed for violating guidelines"
    end
```

---

## 8. Knowledge Base & Forum Sequence

```mermaid
sequenceDiagram
    autonumber
    actor T as Technician/Admin
    participant App as AgriCare App
    participant FS as Firestore
    actor F as Farmer

    T->>App: Create Knowledge Base Article
    T->>App: Fill title, category, content, tags
    App->>FS: Create /knowledgeBase doc
    Note over FS: Article immediately visible

    F->>App: Open Knowledge Base
    App->>FS: Query /knowledgeBase (by category/tags)
    FS-->>App: List of articles
    F->>App: Open article
    App->>FS: Increment views count
    F->>App: Read article content

    Note over F: Community Forum interaction

    F->>App: Create Forum Post
    F->>App: Fill title, content, category
    App->>FS: Create /communityForum doc

    F->>App: Like a post
    App->>FS: Increment post.likes

    F->>App: Reply to post
    App->>FS: Create reply in /communityForum/{id}/replies
    App->>FS: Increment post.replies count

    F->>App: Report post
    App->>FS: Create /reports doc
    Note over FS: Admin notified for moderation
```
