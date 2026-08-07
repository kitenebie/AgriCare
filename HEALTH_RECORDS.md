# Health Records Data Fields

## Per Animal Health Record (Firestore Collection: `healthRecords`)

| Field              | Type      | Description                                                                         |
| ------------------ | --------- | ----------------------------------------------------------------------------------- |
| `animalId`         | string    | FK to animal                                                                        |
| `animalName`       | string    | Quick reference                                                                     |
| `recordType`       | string    | checkup, vaccination, treatment, surgery, deworming, lab_test, emergency, follow_up |
| `date`             | timestamp | Date of service                                                                     |
| `diagnosis`        | string    | What was found (e.g. "Bovine Respiratory Disease")                                  |
| `symptoms`         | string[]  | Observed symptoms (fever, cough, loss of appetite, limping)                         |
| `treatment`        | string    | What was done (e.g. Administered Oxytetracycline 20mg/kg)                           |
| `medication`       | string    | Medicine given                                                                      |
| `dosage`           | string    | Example: 5ml IM                                                                     |
| `weight`           | number    | Weight at time of visit (kg)                                                        |
| `temperature`      | number    | Body temperature (°C)                                                               |
| `technicianId`     | string    | Who performed the service                                                           |
| `technicianName`   | string    | Display name                                                                        |
| `nextFollowUp`     | timestamp | Recommended next visit date                                                         |
| `requiresFollowUp` | boolean   | Determines if calendar reminder should be created                                   |
| `followUpType`     | string    | checkup, vaccination, monitoring, treatment_review                                  |
| `followUpInterval` | number    | Number of days before next visit                                                    |
| `notes`            | string    | Additional observations                                                             |
| `status`           | string    | resolved, ongoing, monitoring                                                       |
| `attachments`      | string[]  | Image URLs (wound photos, lab results)                                              |
| `vaccineType`      | string    | If vaccination (FMD, Hemorrhagic Septicemia, Blackleg, etc.)                        |
| `vaccineBatch`     | string    | Vaccine batch/lot number                                                            |
| `farmerId`         | string    | Owner of animal                                                                     |
| `createdAt`        | timestamp | When record was created                                                             |
| `updatedAt`        | timestamp | Last update                                                                         |

---

# Health Calendar Reminder

## Firestore Collection: `healthReminders`

The `healthReminders` collection is used for scheduling future veterinary services, follow-up visits, vaccination schedules, and technician appointments.

| Field              | Type      | Description                                                                 |
| ------------------ | --------- | --------------------------------------------------------------------------- |
| `healthRecordId`   | string    | FK/reference to healthRecords                                               |
| `animalId`         | string    | FK/reference to animal                                                      |
| `animalName`       | string    | Animal quick reference                                                      |
| `farmerId`         | string    | Owner of animal                                                             |
| `farmerName`       | string    | Farmer display name                                                         |
| `technicianId`     | string    | Assigned technician                                                         |
| `technicianName`   | string    | Technician display name                                                     |
| `reminderType`     | string    | follow_up, vaccination_due, deworming_due, treatment_check, routine_checkup |
| `title`            | string    | Calendar reminder title                                                     |
| `description`      | string    | Detailed reminder information                                               |
| `scheduledDate`    | timestamp | Scheduled date and time of visit                                            |
| `priority`         | string    | low, medium, high, urgent                                                   |
| `status`           | string    | pending, completed, cancelled, missed                                       |
| `notificationSent` | boolean   | Determines if notification was already sent                                 |
| `reminderBefore`   | number    | Number of days before schedule to send reminder                             |
| `completedDate`    | timestamp | Actual date service was completed                                           |
| `completedBy`      | string    | Technician who completed the appointment                                    |
| `notes`            | string    | Additional remarks                                                          |
| `createdAt`        | timestamp | Reminder creation date                                                      |
| `updatedAt`        | timestamp | Last update                                                                 |

---

# Calendar Reminder Workflow

```text
Technician Performs Animal Service
              |
              v
Create Health Record
              |
              v
Technician Sets Next Follow-up Date
              |
              v
System Creates Health Reminder
              |
              v
Add Event to Technician Calendar
              |
              v
Send Notification Reminder
              |
              v
Technician Visits Farmer Again
              |
              v
Complete Service and Update Reminder Status
```
