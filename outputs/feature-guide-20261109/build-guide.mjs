import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/kenne/Desktop/em-res/AgriCare/outputs/feature-guide-20261109";
const rows = [
  ["Admin", "Breed at quantity sa appointment", "Admin Home → Appointments → piliin ang appointment", "Makikita sa appointment card at detalye ang breed at quantity na inilagay ng farmer sa request. Lalabas ang mga field na may naitalang value."],
  ["Farmer", "Mga online technician sa dashboard", "Farmer Home → Dashboard → Online Technicians", "Ipinapakita ang mga technician na may sariwang live-location update. Nakaayos mula pinakamalapit hanggang pinakamalayo kapag available ang lokasyon ng farmer. Para mag-request, buksan ang profile ng technician."],
  ["Farmer", "Request Service mula sa technician profile", "Dashboard → Available Technicians, o Quick Access → Technicians → piliin ang technician", "Bubukas ang full-screen profile. Pindutin ang Request Service para buksan ang request form na naka-select na ang technician."],
  ["Farmer", "Animal details sa Request Service", "Request Service → Step 1: Service & Animal", "Ilagay ang pangalan ng hayop, breed at quantity. Puwedeng pumili ng rehistradong hayop para mapunan ang detalye. Kailangan ang pangalan, breed at quantity bago magpatuloy."],
  ["Farmer", "Magdagdag ng hayop at pumili ng breed", "Farmer Home → Quick Access → My Animals → Add Animal", "I-type ang animal type at piliin ang mungkahing category, saka pumili ng breed. Kapag walang katugmang category, piliin ang Use custom; walang breed choices para sa custom type. Hindi na ipinapakita ang Add Animals category."],
  ["Farmer", "Mag-post ng sick-animal report", "Farmer Home → Quick Access → My Animals → Report sick sa animal card", "Ilagay ang sintomas o concern at pindutin ang Post report. Mamarkahang sick ang animal record at makikita ng technician ang report sa Farmer Health Reports sa dashboard."],
  ["Farmer", "Tingnan at i-message ang technician sa mapa", "Farmer tab bar → Map → piliin ang technician sa mapa o listahan", "Lumilitaw ang profile ng technician na nagbabahagi ng live location. Pindutin ang Message para buksan ang chat."],
  ["Technician", "Tingnan ang farmer health reports", "Technician Home → Dashboard → Farmer Health Reports", "Ipinapakita rito ang hanggang limang animal record na may sick status, kasama ang pangalan ng hayop, nag-report na farmer at sintomas. Awtomatikong nag-a-update ang listahan kapag nagbago ang Firestore data."],
  ["Technician", "Tingnan at i-message ang farmer sa mapa", "Technician tab bar → Map → piliin ang farmer sa mapa o listahan", "Ipinapakita ang mga farmer na nagbabahagi ng live location. Piliin ang farmer para makita ang profile, saka pindutin ang Message para mag-chat."],
  ["Technician", "Breed at quantity sa appointment", "Technician tab bar → Appointments → piliin ang request", "Makikita sa appointment details ang breed at quantity na ibinigay ng farmer, kung available sa request."],
  ["Shared", "Pagbukas ng app at paggawa ng account", "Buksan ang app para mag-log in. Sa login screen, piliin ang Create Account para mag-register.", "Diretso na sa login ang unang screen. Nasa login flow ang pagpunta sa registration."],
  ["Shared", "Pagkuha ng ID photo sa registration", "Registration → ID capture → Review Your ID", "May Retake button pa rin sa kasalukuyang source matapos kumuha ng larawan, kasama ang Use This Photo. Hindi tugma ito sa listahang nagsasabing inalis na ang Retake/Remove control; kailangang itama ang app o ang listahan bago ituro na wala na ang control."],
  ["Shared", "Comma-separated technician specialization", "Create Account → piliin ang Technician → Specialization", "I-type ang mga specialization sa iisang field at paghiwalayin ng comma, halimbawa: Cattle care, vaccination, breeding. Hinahati ng app ang mga ito bilang magkakahiwalay na specialization."],
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Feature Guide");
sheet.showGridLines = false;
sheet.getRange("A2").values = [["AgriCare Feature Guide"]];
sheet.getRange("A3").values = [["Saan bubuksan at paano gamitin ang bawat feature"]];
sheet.getRange("A5:D5").values = [["Side", "Feature", "Saan bubuksan", "Paano gamitin at paano gumagana"]];
sheet.getRange(`A6:D${rows.length + 5}`).values = rows;

const table = sheet.tables.add(`A5:D${rows.length + 5}`, true, "AgriCareFeatureGuide");
table.style = "TableStyleMedium4";
table.showFilterButton = true;
sheet.getRange("A2:D2").format.font = { name: "Arial", size: 16, bold: true, color: "#18372A" };
sheet.getRange("A3:D3").format.font = { name: "Arial", size: 10, italic: true, color: "#52645A" };
sheet.getRange(`A5:D${rows.length + 5}`).format.font = { name: "Arial", size: 10, color: "#1F2937" };
sheet.getRange(`A6:D${rows.length + 5}`).format.wrapText = true;
sheet.getRange(`A6:D${rows.length + 5}`).format.verticalAlignment = "center";
sheet.getRange("A5:D5").format = {
  fill: "#176B45",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A5:D5").format.rowHeight = 28;
sheet.getRange(`A6:D${rows.length + 5}`).format.rowHeight = 90;
sheet.getRange(`A5:A${rows.length + 5}`).format.columnWidth = 15;
sheet.getRange(`B5:B${rows.length + 5}`).format.columnWidth = 34;
sheet.getRange(`C5:C${rows.length + 5}`).format.columnWidth = 48;
sheet.getRange(`D5:D${rows.length + 5}`).format.columnWidth = 78;
sheet.getRange("A2:D3").format.wrapText = false;
sheet.freezePanes.freezeRows(5);

workbook.recalculate();
const inspect = await workbook.inspect({ kind: "sheet,table", maxChars: 3000, tableMaxRows: 4, tableMaxCols: 4 });
console.log(inspect.ndjson);
const preview = await workbook.render({ sheetName: "Feature Guide", range: `A1:D${rows.length + 5}`, scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/feature-guide-preview.png`, new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(`${outputDir}/AgriCare_Feature_Guide.xlsx`);
console.log("Workbook exported.");
process.exit(0);
