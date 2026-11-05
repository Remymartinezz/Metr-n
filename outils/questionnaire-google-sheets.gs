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
 * 5. Pour le tableau de bord : Paramètres du projet → Propriétés du script → DASH_CODE = ton code secret
 *    (puis Déployer → Gérer les déploiements → crayon → Nouvelle version, pour garder la même adresse).
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

// Sans code : seulement le nombre de réponses (pour un compteur « 12 / 30 »).
// Avec ?code=… : toutes les réponses, pour le tableau de bord Metrön.
// Le code n'est PAS écrit ici (ce fichier est public sur GitHub) : il est rangé dans les propriétés du script.
//   Paramètres du projet (roue dentée à gauche) → Propriétés du script → Ajouter : DASH_CODE = ton code secret
function doGet(e) {
  const sh = sheet_();
  const total = Math.max(0, sh.getLastRow() - 1);
  const code = e && e.parameter && e.parameter.code;
  if (!code) return json_({ ok: true, total: total });
  const expected = PropertiesService.getScriptProperties().getProperty('DASH_CODE');
  if (!expected) return json_({ ok: false, error: 'no-code-set' });
  if (code.trim().toLowerCase().normalize('NFC') !== expected.trim().toLowerCase().normalize('NFC')) return json_({ ok: false, error: 'bad-code' });
  const values = total ? sh.getRange(1, 1, total + 1, sh.getLastColumn()).getValues() : [[]];
  return json_({ ok: true, total: total, header: values[0], rows: values.slice(1) });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
