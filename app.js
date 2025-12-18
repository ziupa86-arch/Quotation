const STORAGE_KEY = "clientArchive.v2";

const el = (id) => document.getElementById(id);

const nameInput  = el("name");
const phoneInput = el("phone");
const priceInput = el("price");
const carInput   = el("car");
const regInput   = el("reg");

const saveBtn  = el("saveBtn");
const clearBtn = el("clearBtn");
const cancelEditBtn = el("cancelEditBtn");
const formTitle = el("formTitle");
const editHint = el("editHint");

const tbody    = el("tbody");
const search   = el("search");

const exportJsonBtn = el("exportJsonBtn");
const exportCsvBtn  = el("exportCsvBtn");
const importFile    = el("importFile");
const printAllBtn   = el("printAllBtn");

const statusDot  = el("statusDot");
const statusText = el("statusText");

const printModal = el("printModal");
const printCard  = el("printCard");
const closeModalBtn = el("closeModalBtn");
const printOneBtn = el("printOneBtn");

let state = loadData();
let currentPrintItem = null;
let editingId = null;

function nowISO(){ return new Date().toISOString(); }

function formatDate(iso){
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPrice(v){
  const n = Number(v || 0);
  return n.toFixed(2);
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function telHref(phone){
  const raw = String(phone || "").trim();
  return raw.replace(/[^\d+]/g,"");
}

function normalize(s){
  return String(s ?? "").toLowerCase().trim();
}

function cryptoId(){
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}

function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function validateRegIreland(reg){
  const r = String(reg || "").trim().toUpperCase();
  if(!r) return true;
  return /^[0-9]{1,3}\s*-\s*[A-Z]{1,2}\s*-\s*[0-9]{1,6}$/.test(r);
}

function clearForm(){
  editingId = null;
  formTitle.textContent = "Add client";
  saveBtn.textContent = "Save client";
  cancelEditBtn.classList.add("hidden");
  editHint.classList.add("hidden");

  nameInput.value = "";
  phoneInput.value = "";
  priceInput.value = "";
  carInput.value = "";
  regInput.value = "";
  nameInput.focus();
}

function startEdit(item){
  editingId = item.id;
  formTitle.textContent = "Edit client";
  saveBtn.textContent = "Update";
  cancelEditBtn.classList.remove("hidden");
  editHint.classList.remove("hidden");

  nameInput.value = item.name || "";
  phoneInput.value = item.phone || "";
  priceInput.value = String(Number(item.price || 0).toFixed(2));
  carInput.value = item.car || "";
  regInput.value = (item.reg || "").toUpperCase();
  nameInput.focus();
}

function addOrUpdateClient(){
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const price = priceInput.value.trim();
  const car = carInput.value.trim();
  const reg = regInput.value.trim().toUpperCase();

  if(!name){ alert("Please enter client name."); nameInput.focus(); return; }
  if(!phone){ alert("Please enter phone number."); phoneInput.focus(); return; }
  if(reg && !validateRegIreland(reg)){
    alert("Registration format looks wrong. Example: 231-D-12345");
    regInput.focus();
    return;
  }

  if(editingId){
    const idx = state.findIndex(x => x.id === editingId);
    if(idx === -1){ clearForm(); return; }

    state[idx] = {
      ...state[idx],
      name,
      phone,
      price: price ? Number(price) : 0,
      car,
      reg,
      updatedAt: nowISO()
    };

    saveData();
    render();
    clearForm();
    return;
  }

  const item = {
    id: cryptoId(),
    createdAt: nowISO(),
    name,
    phone,
    price: price ? Number(price) : 0,
    car,
    reg
  };

  state.unshift(item);
  saveData();
  render();
  clearForm();
}

function removeClient(id){
  const ok = confirm("Delete this client record?");
  if(!ok) return;
  state = state.filter(x => x.id !== id);
  saveData();
  render();
  if(editingId === id) clearForm();
}

function matchesSearch(item, q){
  if(!q) return true;
  const hay = [
    item.name, item.phone, item.car, item.reg, String(item.price ?? "")
  ].map(normalize).join(" | ");
  return hay.includes(q);
}

function render(){
  const q = normalize(search.value);
  const rows = state.filter(item => matchesSearch(item, q));

  tbody.innerHTML = rows.map(item => {
    const dateText = formatDate(item.createdAt);
    const phoneSafe = escapeHtml(item.phone);
    const phoneLink = telHref(item.phone);

    return `
      <tr>
        <td class="colDate">${escapeHtml(dateText)}</td>
        <td class="colName">${escapeHtml(item.name)}</td>
        <td class="colPhone"><a class="tel" href="tel:${escapeHtml(phoneLink)}">${phoneSafe}</a></td>
        <td class="colPrice">€${escapeHtml(formatPrice(item.price))}</td>
        <td class="colCar">${escapeHtml(item.car || "")}</td>
        <td class="colReg">${escapeHtml(item.reg || "")}</td>
        <td class="colActions">
          <button class="btn-sm" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>
          <button class="btn-sm danger" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
          <button class="btn-sm" data-action="pdf" data-id="${escapeHtml(item.id)}">PDF</button>
        </td>
      </tr>
    `;
  }).join("");

  updateStatus();
}

function updateStatus(){
  const online = navigator.onLine;
  statusDot.style.background = online ? "var(--ok)" : "var(--bad)";
  statusText.textContent = online ? "Ready" : "Offline";
}

/* PRINT (single) */
function openPrintModal(item){
  currentPrintItem = item;

  printCard.innerHTML = `
    <h3>${escapeHtml(item.name)}</h3>
    <div class="kv">
      <div class="k">Date</div><div>${escapeHtml(formatDate(item.createdAt))}</div>
      <div class="k">Phone</div><div>${escapeHtml(item.phone)}</div>
      <div class="k">Price</div><div>€${escapeHtml(formatPrice(item.price))}</div>
      <div class="k">Car</div><div>${escapeHtml(item.car || "")}</div>
      <div class="k">Registration</div><div>${escapeHtml(item.reg || "")}</div>
    </div>
  `;

  printModal.classList.add("show");
  printModal.setAttribute("aria-hidden", "false");
}

function closePrintModal(){
  currentPrintItem = null;
  printModal.classList.remove("show");
  printModal.setAttribute("aria-hidden", "true");
}

function printItem(item){
  const existing = document.getElementById("printOnly");
  if(existing) existing.remove();

  const div = document.createElement("div");
  div.id = "printOnly";
  div.style.display = "none";

  div.innerHTML = `
    <h2>Client Archive - Client card</h2>
    <div class="kv">
      <div class="k">Date</div><div>${escapeHtml(formatDate(item.createdAt))}</div>
      <div class="k">Name</div><div>${escapeHtml(item.name)}</div>
      <div class="k">Phone</div><div>${escapeHtml(item.phone)}</div>
      <div class="k">Price</div><div>€${escapeHtml(formatPrice(item.price))}</div>
      <div class="k">Car</div><div>${escapeHtml(item.car || "")}</div>
      <div class="k">Registration</div><div>${escapeHtml(item.reg || "")}</div>
    </div>
    <hr style="margin:14px 0;">
    <div style="font-size:12px;color:#444;">Generated from Client Archive (offline local storage).</div>
  `;

  document.body.appendChild(div);
  window.print();
}

function printAll(){
  const existing = document.getElementById("printOnly");
  if(existing) existing.remove();

  const div = document.createElement("div");
  div.id = "printOnly";
  div.style.display = "none";

  const rows = state.map(item => `
    <div style="margin-bottom:16px;">
      <h2 style="margin:0 0 8px;font-size:18px;">${escapeHtml(item.name)}</h2>
      <div class="kv">
        <div class="k">Date</div><div>${escapeHtml(formatDate(item.createdAt))}</div>
        <div class="k">Phone</div><div>${escapeHtml(item.phone)}</div>
        <div class="k">Price</div><div>€${escapeHtml(formatPrice(item.price))}</div>
        <div class="k">Car</div><div>${escapeHtml(item.car || "")}</div>
        <div class="k">Registration</div><div>${escapeHtml(item.reg || "")}</div>
      </div>
      <hr style="margin:12px 0;">
    </div>
  `).join("");

  div.innerHTML = `
    <h2 style="margin:0 0 10px;">Client Archive - All records</h2>
    <div style="font-size:12px;color:#444;margin-bottom:12px;">Total: ${state.length}</div>
    ${rows || `<div style="color:#444;">No records.</div>`}
  `;

  document.body.appendChild(div);
  window.print();
}

/* EXPORT / IMPORT */
function downloadFile(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJSON(){
  downloadFile(`client-archive-${Date.now()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function csvCell(v){
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
  return s;
}

function exportCSV(){
  const header = ["createdAt","name","phone","price","car","reg"];
  const lines = [
    header.join(","),
    ...state.map(x => [
      x.createdAt,
      csvCell(x.name),
      csvCell(x.phone),
      String(Number(x.price || 0)),
      csvCell(x.car || ""),
      csvCell(x.reg || "")
    ].join(","))
  ];
  downloadFile(`client-archive-${Date.now()}.csv`, lines.join("\n"), "text/csv");
}

async function importData(file){
  if(!file) return;
  const text = await file.text();
  const name = (file.name || "").toLowerCase();

  try{
    if(name.endsWith(".json")){
      const arr = JSON.parse(text);
      if(!Array.isArray(arr)) throw new Error("Invalid JSON");
      const cleaned = arr.map(normalizeRecord).filter(Boolean);
      state = mergeRecords(state, cleaned);
      saveData(); render(); alert("Imported JSON ✅"); return;
    }

    if(name.endsWith(".csv")){
      const cleaned = parseCSV(text).map(normalizeRecord).filter(Boolean);
      state = mergeRecords(state, cleaned);
      saveData(); render(); alert("Imported CSV ✅"); return;
    }

    alert("Unsupported file. Use .json or .csv");
  }catch{
    alert("Import failed.");
  }
}

function normalizeRecord(r){
  if(!r) return null;

  const createdAt = r.createdAt || r.date || r.CreatedAt || r.Date || nowISO();
  const name = (r.name || r.Name || "").toString().trim();
  const phone = (r.phone || r.Phone || "").toString().trim();
  const price = Number(r.price ?? r.Price ?? 0) || 0;
  const car = (r.car || r.Car || r.make || r.Make || "").toString().trim();
  const reg = (r.reg || r.Reg || r.registration || r.Registration || "").toString().trim().toUpperCase();

  if(!name || !phone) return null;

  return {
    id: r.id || cryptoId(),
    createdAt: new Date(createdAt).toString() === "Invalid Date" ? nowISO() : new Date(createdAt).toISOString(),
    name,
    phone,
    price,
    car,
    reg
  };
}

function mergeRecords(oldArr, newArr){
  const map = new Map();
  for(const x of oldArr) map.set(x.id, x);
  for(const x of newArr) map.set(x.id, x);
  return Array.from(map.values()).sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if(!lines.length) return [];
  const header = splitCsvLine(lines[0]).map(h => h.trim());
  const out = [];
  for(let i=1;i<lines.length;i++){
    const cols = splitCsvLine(lines[i]);
    const obj = {};
    header.forEach((h, idx) => obj[h] = cols[idx] ?? "");
    out.push(obj);
  }
  return out;
}

function splitCsvLine(line){
  const res = [];
  let cur = "";
  let inQ = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch === '"'){
      if(inQ && line[i+1] === '"'){ cur += '"'; i++; }
      else inQ = !inQ;
    }else if(ch === "," && !inQ){
      res.push(cur); cur = "";
    }else{
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

/* EVENTS */
saveBtn.addEventListener("click", addOrUpdateClient);
clearBtn.addEventListener("click", clearForm);
cancelEditBtn.addEventListener("click", clearForm);
search.addEventListener("input", render);

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if(!btn) return;
  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  const item = state.find(x => x.id === id);
  if(!item) return;

  if(action === "delete") removeClient(id);
  if(action === "edit") startEdit(item);
  if(action === "pdf") openPrintModal(item);
});

closeModalBtn.addEventListener("click", closePrintModal);
printModal.addEventListener("click", (e) => { if(e.target === printModal) closePrintModal(); });
printOneBtn.addEventListener("click", () => {
  if(!currentPrintItem) return;
  closePrintModal();
  printItem(currentPrintItem);
});

printAllBtn.addEventListener("click", printAll);

exportJsonBtn.addEventListener("click", exportJSON);
exportCsvBtn.addEventListener("click", exportCSV);
importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  await importData(file);
  importFile.value = "";
});

window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);

/* INIT */
render();
updateStatus();