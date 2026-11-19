<!-- converted from AgriCare_Feature_Guide.xlsx -->

## Sheet: Feature Guide
| AgriCare Feature Guide |  |  |  |
| --- | --- | --- | --- |
| Saan bubuksan at paano gamitin ang bawat feature |  |  |  |
| Side | Feature | Saan bubuksan | Paano gamitin at paano gumagana |
| Admin | Breed at quantity sa appointment | Admin Home → Appointments → piliin ang appointment | Makikita sa appointment card at detalye ang breed at quantity na inilagay ng farmer sa request. Lalabas ang mga field na may naitalang value. |
| Farmer | Mga online technician sa dashboard | Farmer Home → Dashboard → Online Technicians | Ipinapakita ang mga technician na may sariwang live-location update. Nakaayos mula pinakamalapit hanggang pinakamalayo kapag available ang lokasyon ng farmer. Para mag-request, buksan ang profile ng technician. |
| Farmer | Request Service mula sa technician profile | Dashboard → Available Technicians, o Quick Access → Technicians → piliin ang technician | Bubukas ang full-screen profile. Pindutin ang Request Service para buksan ang request form na naka-select na ang technician. |
| Farmer | Animal details sa Request Service | Request Service → Step 1: Service & Animal | Ilagay ang pangalan ng hayop, breed at quantity. Puwedeng pumili ng rehistradong hayop para mapunan ang detalye. Kailangan ang pangalan, breed at quantity bago magpatuloy. |
| Farmer | Magdagdag ng hayop at pumili ng breed | Farmer Home → Quick Access → My Animals → Add Animal | I-type ang animal type at piliin ang mungkahing category, saka pumili ng breed. Kapag walang katugmang category, piliin ang Use custom; walang breed choices para sa custom type. Hindi na ipinapakita ang Add Animals category. |
| Farmer | Mag-post ng sick-animal report | Farmer Home → Quick Access → My Animals → Report sick sa animal card | Ilagay ang sintomas o concern at pindutin ang Post report. Mamarkahang sick ang animal record at makikita ng technician ang report sa Farmer Health Reports sa dashboard. |
| Farmer | Tingnan at i-message ang technician sa mapa | Farmer tab bar → Map → piliin ang technician sa mapa o listahan | Lumilitaw ang profile ng technician na nagbabahagi ng live location. Pindutin ang Message para buksan ang chat. |
| Technician | Tingnan ang farmer health reports | Technician Home → Dashboard → Farmer Health Reports | Ipinapakita rito ang hanggang limang animal record na may sick status, kasama ang pangalan ng hayop, nag-report na farmer at sintomas. Awtomatikong nag-a-update ang listahan kapag nagbago ang Firestore data. |
| Technician | Tingnan at i-message ang farmer sa mapa | Technician tab bar → Map → piliin ang farmer sa mapa o listahan | Ipinapakita ang mga farmer na nagbabahagi ng live location. Piliin ang farmer para makita ang profile, saka pindutin ang Message para mag-chat. |
| Technician | Breed at quantity sa appointment | Technician tab bar → Appointments → piliin ang request | Makikita sa appointment details ang breed at quantity na ibinigay ng farmer, kung available sa request. |
| Shared | Pagbukas ng app at paggawa ng account | Buksan ang app para mag-log in. Sa login screen, piliin ang Create Account para mag-register. | Diretso na sa login ang unang screen. Nasa login flow ang pagpunta sa registration. |
| Shared | Pagkuha ng ID photo sa registration | Registration → ID capture → Review Your ID | removed |
| Shared | Comma-separated technician specialization | Create Account → piliin ang Technician → Specialization | I-type ang mga specialization sa iisang field at paghiwalayin ng comma, halimbawa: Cattle care, vaccination, breeding. Hinahati ng app ang mga ito bilang magkakahiwalay na specialization. |