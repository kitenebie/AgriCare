# AgriCare ADB test checklist

- **Date:** 2026-11-13
- **Device:** Vivo V2310, USB debugging
- **Installed app:** 2.0.5 (versionCode 4)
- **Accounts:** Farmer and Technician test accounts (credentials omitted)

## Farmer

| Test | Result | Remarks |
|---|---|---|
| Sign in and open dashboard | ✅ Pass | Farmer dashboard loaded; showed animals, upcoming visits, and an online technician while the Technician account was active. |
| Health Records badge matches records | ✅ Pass | Badge showed 1; Health Records listed the Deworming record dated Nov 8, 2026. |
| Open health record details | ✅ Pass | Details showed symptom, treatment, and notes. |
| Open Messages | ✅ Pass | Three chat threads loaded; no message was sent. |
| Map service-request marker | ✅ Pass | Accepted request marker opened its details drawer with service, animal, farmer, technician, schedule, and farm location. |
| Request Service steps 1–5 | ✅ Pass | Step 2 showed animal type, breed, and quantity; Steps 3–5 showed schedule, issue templates, and review. Request was not submitted. |
| Request form with keyboard open | ✅ Pass | Step 1 inputs remained visible while the keyboard was open. |
| Past-time validation | ✅ Pass | Past dates were disabled; for the current date, past time options were disabled. |
| Search camera centering on an online technician | ⚠️ Blocked | Only one USB device was connected, so Tech B and Farmer B could not stay online at the same time. On the final Farmer A map, the header and nearby list both showed 0 online; the completed request was absent. Screenshot: `qa-farmer-map-completed.png`. Search centering and clear-search recentering remain unverified pending a second device. |
| Submit Farmer QA service request | ✅ Pass | Submitted a clearly labeled QA-only Vitamin Injection request for Cow/Native, quantity 1, Nov 16 at 08:00 AM. Success confirmation appeared; no real service was intended. |
| Pending request marker and details drawer | ✅ Pass | Farmer Map showed the orange pending marker. Tap opened full details with service, animal, schedule, farmer, unassigned technician, and location. Screenshot: `qa-farmer-request-pending-drawer.png`. |

## Technician

| Test | Result | Remarks |
|---|---|---|
| Sign in and open dashboard | ✅ Pass | Dashboard loaded with accepted appointments and Farmer Request Services section. |
| Public request visibility and details drawer | ✅ Pass | Submitted Farmer QA request appeared as Public; the drawer showed the service, date/time, animal type, breed, quantity, farmer, and location. |
| Accept a public farmer request | ✅ Pass (Tech B) | Reused the same Pending QA request after Tech A declined it. Tech B saw it as Public; the drawer matched Vitamin Injection, Cow/Native, quantity 1, Nov 16 at 08:00 AM, farmer, location, and QA-only notes. Accept succeeded and the app showed “Request accepted / The request is confirmed.” Screenshot: `qa-techb-public.png`, `qa-techb-public-details.png`. The Farmer's intermediate Accepted state/green marker was not checked before proceeding to completion. |
| Decline a public farmer request | ✅ Pass | Confirmation succeeded and the app reported that the farmer was notified. |
| Request remains pending after one Technician declines | ✅ Pass | Farmer dashboard still showed 1 Pending Service; My Appointments showed the QA request as Pending and Unassigned after Technician decline. Screenshot: `qa-farmer-request-after-decline.png`. |
| Health Records badge and list | ✅ Pass | Badge reflected the `healthRecords` collection; no technician health record existed during the check. The page loaded without the earlier Firestore composite-index error. |
| Availability setup options | ✅ Pass | Daily Hours, One-time, and Weekly setup drawers opened. Daily and one-time time-range controls were visible; no schedule was saved. |
| Weekly weekdays match saved schedule | ✅ Pass on retest | Reopened Weekly schedule after the source adjustment. Selected chips matched saved rows: Mon, Tue, Wed, Thu, Sat, Sun. No schedule was saved or changed. Screenshot: `weekly-availability-verified.png`. |
| Weekly add-time control | ✅ Pass, UI only | Time picker opened with hour, 15-minute, and AM/PM choices. Existing weekly entries display a single time per weekday, not start/end ranges. Cancelled without saving. Screenshot: `weekly-time-picker.png`. |
| Complete the QA request | ✅ Pass | Tech B marked the accepted QA request Completed. Farmer A's My Appointments showed Completed, assigned to Jelina Equiz, with the QA-only note. Tech B schedule returned to 0 accepted appointments. Screenshots: `qa-techb-completed.png`, `qa-farmer-completed.png`. |
| Completed request removed from Farmer Map | ✅ Pass | After completion, Farmer Map showed no Farmer request marker; only the technician location marker remained. Screenshot: `qa-farmer-map-completed.png`. |
| Map farmer marker details | ✅ Pass | Tapping a farmer marker opened the request-details drawer. |

## Build and session

| Test | Result | Remarks |
|---|---|---|
| Android debug build | ✅ Pass | `assembleDebug` completed successfully. |
| Installed version | ✅ Pass | Device reported version 2.0.5, versionCode 4. |
| Fresh app launch after Metro restart | ✅ Pass | The app initially hung because Metro was IPv6-only. Starting Metro with LAN binding and ADB reverse restored the Technician dashboard; the availability screen then loaded. |

The original QA request was reused; Tech A's prior decline remained intact. Tech B accepted and completed that request. Farmer A verified Completed and the request marker disappeared from the map. No other appointment or availability was changed. Live two-device map search/centering and the Farmer's intermediate Accepted/green-marker state remain unverified: only one USB device was connected, and the request was completed before switching back to Farmer A.
