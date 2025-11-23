function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Customers');
    if (!sheet) throw new Error("Sheet 'Customers' not found");

    if (!e.postData) {
      const data = getCustomers(sheet);
      return createJSONOutput({ status: 'success', data: data });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'add') {
      addCustomer(sheet, payload.data);
    } else if (action === 'update') {
      updateCustomer(sheet, payload.data);
    } else if (action === 'delete') {
      deleteCustomer(sheet, payload.id);
    }

    // CRITICAL FIX: Force the sheet to apply changes immediately
    SpreadsheetApp.flush();

    const data = getCustomers(sheet);
    return createJSONOutput({ status: 'success', data: data });

  } catch (err) {
    return createJSONOutput({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getCustomers(sheet) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift(); 
  
  return rows.map(row => ({
    id: String(row[0]), // Ensure ID is always a string
    name: row[1],
    credit: Number(row[2]),
    stamps: Number(row[3]),
    skipNextStamp: row[4] === true || row[4] === "TRUE",
    history: row[5] ? JSON.parse(row[5]) : []
  })).filter(c => c.id && c.id !== ""); 
}

function addCustomer(sheet, c) {
  sheet.appendRow([
    String(c.id), 
    c.name, 
    c.credit, 
    c.stamps, 
    c.skipNextStamp, 
    JSON.stringify(c.history)
  ]);
}

function updateCustomer(sheet, c) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(c.id)) {
      const range = sheet.getRange(i + 1, 1, 1, 6); 
      range.setValues([[
        String(c.id), 
        c.name, 
        c.credit, 
        c.stamps, 
        c.skipNextStamp, 
        JSON.stringify(c.history)
      ]]);
      break;
    }
  }
}

function deleteCustomer(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
