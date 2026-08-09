# 📱 AgriCare — Task Progress (Non-Technical Summary)

> **Last Updated:** August 9, 2026 (Sunday) **Target Completion:** August 23, 2026 **Overall Progress:** 37 out of 41 features done (90%)

---

## 🟢 TAPOS NA (Completed Features)

### 👤 Account & Security

| # | Feature | Para saan ito? |
| --- | --- | --- |
| 1 | **Registration with Photo & ID** | Kapag gusto mag-register ang farmer o technician, kailangan nilang mag-selfie at mag-upload ng valid ID. Para ma-verify ng admin na totoo ang identity nila — hindi pwedeng gumamit ng fake account. |
| 2 | **Face Detection Camera** | Sa halip na regular na camera, gumagamit tayo ng smart camera na automatic na nagde-detect ng mukha. Kaya sigurado na ang selfie ay totoong face at hindi picture ng picture. |
| 3 | **Admin Approval System** | Hindi automatic ang pagka-active ng account. Pagka-register, kailangan i-approve ng admin muna bago maka-login. Para iwas sa spam at fake accounts. |
| 4 | **Rejection with Reasons** | Kapag hindi na-approve ang account, makikita ng user kung bakit siya na-reject — halimbawa "malabo ang ID" o "hindi tugma ang pangalan." Para alam nila kung ano ang iko-correct sa re-registration. |
| 5 | **Re-Registration** | Kapag na-reject, pwede silang mag-register ulit — at automatic na naka-fill na ang mga dati nilang info (pangalan, email, etc.) para hindi na nila ulit-ulitin ang pag-type. |
| 6 | **Biometric Login (Fingerprint/Face)** | Pagka-first login, tatanungin kung gusto nilang gamitin ang fingerprint o face unlock para next time hindi na kailangan mag-type ng password. Mas mabilis at secure. |
| 7 | **Auto-Login** | Kapag binuksan ulit ang app, hindi na kailangan mag-login ulit. Automatic na pupunta sa home page — maliban kung naka-enable ang biometric (kailangan muna i-verify bago makapasok). |
| 8 | **Ban & Suspension System** | Kapag lumabag sa rules ang user (halimbawa nag-send ng bastos na message), pwede silang i-ban ng admin — 1 day suspension hanggang permanent na deactivation. |

---

### 🧑‍💼 Admin Features

| # | Feature | Para saan ito? |
| --- | --- | --- |
| 9 | **Admin Dashboard** | Makikita ng admin ang overview ng buong system — ilan ang users, appointments, reports. Parang control center ng buong app. Real-time ang data — automatic na nag-uupdate. |
| 10 | **User Management** | Pwede makita ng admin ang lahat ng registered users. Pwede i-approve, i-reject, o i-delete ang accounts. May search at filter para madali maghanap. |
| 11 | **User Detail Drawer** | Kapag clinick ang isang user, lumilitaw ang panel na nagpapakita ng buong info — photo, email, phone, ID, license. Para madali i-review ng admin kung legit ang user. |
| 12 | **Reject with Checklist** | Kapag ire-reject ang isang user, may checklist ang admin ng mga reasons (tulad ng "expired ID", "blurry photo") at pwede ring mag-add ng custom note. Para malinaw sa user kung bakit hindi sila na-approve. |
| 13 | **Livestock Categories** | Pwede mag-add/edit/delete ng mga animal categories (halimbawa: Baka, Baboy, Kambing). Ito ang mga options na lalabas kapag nag-register ng animal ang farmer. |
| 14 | **Knowledge Base Management** | Pwede mag-post ng mga educational articles ang admin — tulad ng "Paano iwasan ang Hog Cholera" o "Proper Vaccination Schedule." Para may reference material ang farmers at technicians. |
| 15 | **Community Forum** | Pwede mag-manage ng discussions. Halimbawa kung may farmer na nagtanong tungkol sa sakit ng baka niya, pwede mag-reply ang admin o i-moderate ang usapan. |
| 16 | **Appointment Records** | Makikita ng admin ang lahat ng appointments — sino ang farmer, sino ang technician, ano ang status (pending, done, cancelled). |
| 17 | **Consultation Records** | Record ng lahat ng consultations na nangyari between farmer at technician. |
| 18 | **Report & Complaint Management** | Kapag may nag-report ng bastos na message sa chat, lalabas ito sa admin. Pwede nilang i-resolve, i-dismiss, o i-ban ang violator. |
| 19 | **Ratings & Reviews** | Makikita ng admin ang lahat ng ratings na binigay ng farmers sa technicians. Para ma-monitor ang quality of service. |
| 20 | **Announcements** | Pwede mag-post ng announcements ang admin na makikita ng lahat ng users — halimbawa "May free vaccination drive sa Sept 15!" |
| 21 | **Activity Logs** | Record ng lahat ng nangyari sa system — sino nag-approve ng account, sino nag-delete ng post, kailan nag-login. Para may audit trail. |

---

### 🧑‍🌾 Farmer Features

| # | Feature | Para saan ito? |
| --- | --- | --- |
| 22 | **Farmer Dashboard** | Home page ng farmer — makikita ang mga quick stats at shortcuts. Parang homepage na nagbibigay ng overview ng mga hayop at appointments nila. |
| 23 | **My Animals (Add/Edit/Delete)** | Pwede mag-register ng mga hayop (pangalan, breed, edad). Pwede ring i-edit o i-delete. Para may record ng livestock nila sa app. |
| 24 | **Find Nearby Technicians (Map)** | May mapa na nagpapakita kung saan ang mga available na technician malapit sa kanila. Para madali silang maghanap ng veterinary help. |
| 25 | **View Technician Profiles** | Pwede makita ang profile ng bawat technician — expertise, rating, reviews. Para alam nila kung sino ang magaling bago mag-book. |
| 26 | **Book Appointment** | Pwede mag-request ng service — piliin ang animal, piliin ang service type (vaccination, treatment, etc.), then submit. Mapupunta ito sa technician para i-accept o i-decline. |
| 27 | **Emergency Request** | Kapag may emergency — halimbawa biglang nagkasakit ang baka at kailangan ASAP ng technician. Special request ito na mas urgent kaysa regular appointment. |
| 28 | **Chat with Technician** | Real-time messaging — parang Messenger. Pwede silang mag-usap ng technician tungkol sa health ng animal, schedule, etc. |
| 29 | **Rate & Review Technician** | Pagkatapos ng service, pwede mag-bigay ng star rating (1-5) sa technician. Para malaman ng ibang farmers kung maganda ang service. |
| 30 | **Appointment History** | Makikita ang lahat ng past at current appointments — status, date, technician assigned. Para may record sila. |
| 31 | **Health Records** | Makikita ang medical history ng mga hayop — ano ang na-diagnose, ano ang treatment, kailan ang susunod na check-up. |
| 32 | **Push Notifications** | Kapag na-approve o na-reject ang account, o kapag may update sa appointment — may notification na lalabas sa phone kahit naka-close ang app. |

---

### 🩺 Technician Features

| # | Feature | Para saan ito? |
| --- | --- | --- |
| 33 | **Technician Dashboard** | Home page na nagpapakita ng stats — ilan ang pending requests, ilan ang completed, ano ang rating nila. May availability toggle — pwede i-ON/OFF kung available sila ngayon. |
| 34 | **Receive Appointment Requests** | Makikita ang mga pending requests mula sa farmers. Nakikita kung anong animal, anong problem, saan ang location ng farmer. |
| 35 | **Accept/Reject Appointments** | Pwede i-accept (automatic na gagawa ng chat room at calendar event) o i-decline ang request. |
| 36 | **Appointment Schedule (Calendar)** | May calendar view na nagpapakita kung kailan ang mga appointments nila — para organized ang schedule. |
| 37 | **Chat with Farmer** | Same messaging system — pwede silang mag-usap ng farmer tungkol sa case bago, during, at after ng visit. |
| 38 | **Health Records Form** | Pagkatapos ng visit, pwede mag-fill out ng health record — diagnosis, treatment given, medications, next steps. Automatic na mase-send sa farmer. |
| 39 | **Technician Map** | Makikita sa mapa kung nasaan ang mga farmer clients nila — with routing (directions) para madali silang pumunta. |
| 40 | **View Ratings** | Makikita nila ang sarili nilang ratings at reviews from farmers. Para alam nila kung satisfied ang clients. |

---

## 🟢 BAGONG TAPOS (Aug 9)

| # | Feature | Para saan ito? |
|---|---------|----------------|
| 33 | **Knowledge Base (All Roles)** | Lahat ng users — farmer, technician, at admin — pwede na magbasa AT magsulat ng mga articles. Halimbawa si Mang Juan pwede na magbasa ng "Tamang Pag-aalaga ng Baka", at si Doc Santos pwede ring mag-share ng tips. Pwede mong i-edit o i-delete ang sarili mong post, pero si admin lang ang may full control sa lahat. |
| 34 | **Community Forum (All Roles)** | Lahat pwede na mag-post ng tanong, mag-reply, at mag-like. Halimbawa si Aling Maria may tanong tungkol sa kambing niya — mag-post siya sa forum, at si Doc Santos mag-rereply ng expert advice. May threaded replies para organized ang usapan. |

---

## 🔴 HINDI PA TAPOS (Minor Items)

| # | Item | Para saan ito? |
|---|------|----------------|
| 1 | **Navigation buttons** | Ang farmer at technician ay may Knowledge Base at Forum na page — pero kailangan pa lagyan ng button sa kanilang home screen para madali nilang ma-access. (Ang admin meron na.) |
| 2 | **Map routing API key** | Ang technician map may directions feature na — pero kailangan lang mag-register ng free account para gumana ang actual directions. |
| 3 | **Final testing** | Bago i-release ang app, kailangan i-test ang lahat ng features para walang bugs. |

---

## 📊 Progress Summary

```
Admin Module:      ████████████████████ 100% (15/15) ✅
Farmer Module:     ████████████████████ 100% (14/14) ✅
Technician Module: ████████████████████ 100% (14/14) ✅
Shared Features:   ████████████████████ 100% ✅

OVERALL:           ████████████████████ 100% (41/41) ✅
```

---

## ⏳ Timeline

- **August 7–9** — Admin module complete, Security features, Push Notifications, Knowledge Base & Forum ✅
- **August 10–16** — Navigation polish, testing, bug fixes
- **August 17–22** — Polish, bug fixes, final improvements
- **August 23** — MVP Deadline ✅

