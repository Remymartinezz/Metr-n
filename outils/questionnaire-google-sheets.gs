/**
 * Metrön · réception des réponses du questionnaire dans Google Sheets
 *
 * Installation (une seule fois, par le propriétaire du compte Google) :
 * 1. Crée un Google Sheets vide, nomme-le « Metrön · Questionnaire ».
 * 2. Menu Extensions → Apps Script. Efface tout, colle ce fichier, enregistre.
 * 3. Déployer → Nouveau déploiement → type « Application Web ».
 *    Exécuter en tant que : Moi. Qui a accès : Tout le monde. → Déployer, puis autoriser.
 * 4. Copie l'adresse qui finit par /exec et donne-la à Claude (elle va dans questionnaire.html, ENDPOINT).
 *
 * Chaque réponse = une ligne ; une colonne par question (créée toute seule à la première réponse).
 * Une même réponse envoyée deux fois (réseau qui coupe) n'est enregistrée qu'une fois, grâce à son id.
 */
const SHEET = 'Réponses';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);                                   // deux réponses en même temps : l'une attend l'autre
  try {
    const row = JSON.parse(e.postData.contents);
    const sh = sheet_();
    let head = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    if (!head.length) { head = Object.keys(row); sh.appendRow(head); sh.setFrozenRows(1); }
    Object.keys(row).forEach(k => { if (!head.includes(k)) { head.push(k); sh.getRange(1, head.length).setValue(k); } });
    // Déjà reçue ? (même id) → on ne la compte pas deux fois
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat() : [];
    if (!ids.includes(row.id)) sh.appendRow(head.map(k => row[k] ?? ''));
    return json_({ ok: true, total: Math.max(0, sh.getLastRow() - 1) });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Le nombre de réponses (pour un compteur « 12 / 30 »)
function doGet() {
  const sh = sheet_();
  return json_({ ok: true, total: Math.max(0, sh.getLastRow() - 1) });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
