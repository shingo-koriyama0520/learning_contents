/* =========================
  GET: データ取得
  ?key=xxx
========================= */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const key = e.parameter.key;

  if (!key) {
    return error_("key parameter is required");
  }

  const sheetName = getSheetNameByKey_(ss, key);
  if (!sheetName) {
    return error_("invalid key");
  }

  const sheet = ss.getSheetByName(sheetName);
  const data = sheetToObjects_(sheet);

  return success_(data);
}


/* =========================
  POST: CRUD操作
  body: { key, action, data, id }
========================= */

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const body = JSON.parse(e.postData.contents);

    const key = body.key;
    const action = body.action;
    const data = body.data || {};
    const id = body.id;

    if (!key) return error_("key is required");
    if (!action) return error_("action is required");

    const sheetName = getSheetNameByKey_(ss, key);
    if (!sheetName) {
      return error_("invalid key");
    }

    const sheet = ss.getSheetByName(sheetName);

    if (action === "create") {
      return success_(create_(sheet, data));
    }

    if (action === "update") {
      return success_(update_(sheet, id, data));
    }

    if (action === "delete") {
      delete_(sheet, id);
      return success_({ id });
    }

    return error_("invalid action");

  } catch (err) {
    return error_(err.message);
  }
}


/* =========================
  config → sheetName変換
  configシートはヘッダーあり
  A列=key, B列=sheet_name
========================= */

function getSheetNameByKey_(ss, key) {
  const config = ss.getSheetByName("config").getDataRange().getValues();

  // 1行目がヘッダー（key, sheet_name）
  const headers = config[0];
  const keyIndex = headers.indexOf("key");
  const nameIndex = headers.indexOf("sheet_name");

  for (let i = 1; i < config.length; i++) {
    if (config[i][keyIndex] === key) {
      return config[i][nameIndex];
    }
  }
  return null;
}


/* =========================
  シート → オブジェクト配列変換
========================= */

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}


/* =========================
  id列を大文字小文字無視で探す
========================= */

function findIdColumnIndex_(headers) {
  return headers.findIndex(h => String(h).toLowerCase() === "id");
}


/* =========================
  Create
========================= */

function create_(sheet, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const id = getNextId_(sheet);

  // idを大文字小文字問わずセット
  const idKey = headers.find(h => String(h).toLowerCase() === "id");
  if (idKey) data[idKey] = id;

  const row = headers.map(h => data[h] !== undefined ? data[h] : "");
  sheet.appendRow(row);

  return { id };
}


/* =========================
  Update
========================= */

function update_(sheet, id, data) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = findIdColumnIndex_(headers);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      headers.forEach((h, j) => {
        if (h in data) {
          sheet.getRange(i + 1, j + 1).setValue(data[h]);
        }
      });
      return { id };
    }
  }
  throw new Error("not found");
}


/* =========================
  Delete
========================= */

function delete_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = findIdColumnIndex_(headers);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  throw new Error("not found");
}


/* =========================
  次のID採番（最大値+1）
========================= */

function getNextId_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = findIdColumnIndex_(headers);

  let max = 0;
  for (let i = 1; i < values.length; i++) {
    const v = Number(values[i][idIndex]);
    if (v > max) max = v;
  }
  return max + 1;
}


/* =========================
  レスポンス共通
========================= */

function success_(data) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function error_(msg) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: msg
  })).setMimeType(ContentService.MimeType.JSON);
}