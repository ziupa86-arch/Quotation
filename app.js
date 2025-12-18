// ===== Client Archive (offline, localStorage) =====
const KEY = "client_archive_v1";

const $ = (id) => document.getElementById(id);

const nameEl  = $("name");
const phoneEl = $("phone");
const priceEl = $("price");
const carEl   = $("car");
const regEl   = $("reg");

const saveBtn  = $("saveBtn");
const clearBtn = $("clearBtn");
const searchEl = $("search");
const tbody    = $("tbody");

let editingId = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

let data = load();

function nowISO() {
  return new Date().toISOString();
}

function fmtDate(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtPrice(v) {
  const n = Number(v || 0);
  return n.toFixed(2);
}

function cleanTel(s) {
  return String(s || "").trim().replace(/[^\d+]/g, "");
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function resetForm() {
  editingId = null;
  nameEl.value = "";
  phoneEl.value = "";
  priceEl.value = "";
  carEl.value = "";
  regEl.value = "";
  saveBtn.textContent = "Save";
  nameEl.focus();
}

function startEdit(item) {
  editingId = item.id;
  nameEl.value = item.name || "";
  phoneEl.value = item.phone || "";
  priceEl.value = String(Number(item.price || 0).toFixed(2));
  carEl.value = item.car || "";
  regEl.value = item.reg || "";
  saveBtn.textContent = "Update";
  nameEl.focus();
}

function removeItem(id) {
  if (!confirm("Delete this client?")) return;
  data = data.filter(x => x.id !== id);
  save(data);
  render();
  if (editingId === id) resetForm();
}

function addOrUpdate() {
  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const price = priceEl.value.trim();
  const car = carEl.value.trim();
  const reg = regEl.value.trim().toUpperCase();

  if (!name) { alert("Enter client name"); nameEl.focus(); return; }
  if (!phone) { alert("Enter phone number"); phoneEl.focus(); return; }

  if (editingId) {
    const idx = data.findIndex(x => x.id === editingId);
    if (idx >= 0) {
      data[idx] = {
        ...data[idx],
        name,
        phone,
        price: price ? Number(price) : 0,
        car,
        reg,
        updatedAt: nowISO(),
      };
      save(data);
      render();
      resetForm();
      return;
    }
  }

  const item = {
    id: "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16),
    createdAt: nowISO(),
    name,
    phone,
    price: price ? Number(price) : 0,
    car,
    reg,
  };

  data.unshift(item);
  save(data);
  render();
  resetForm();
}

function matches(item, q) {
  if (!q) return true;
  const hay = `${item.name} ${item.phone} ${item.car} ${item.reg} ${item.price}`.toLowerCase();
  return hay.includes(q);
}

function printOne(item) {
  const html = `
    <div style="font-family:Arial; padding:18px;">
      <h2 style="margin:0 0 12px;">Client card</h2>
      <div><b>Date:</b> ${esc(fmtDate(item.createdAt))}</div>
      <div><b>Name:</b> ${esc(item.name)}</div>
      <div><b>Phone:</b> ${esc(item.phone)}</div>
      <div><b>Price:</b> €${esc(fmtPrice(item.price))}</div>
      <div><b>Car:</b> ${esc(item.car || "")}</div>
      <div><b>Reg:</b> ${esc(item.reg || "")}</div>
    </div>
  `;

  const w = window.open("", "_blank");
  if (!w) { alert("Popup blocked. Use Safari and allow popups."); return; }
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Client PDF</title></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function render() {
  const q = (searchEl.value || "").trim().toLowerCase();
  const rows = data.filter(x => matches(x, q));

  tbody.innerHTML = rows.map(item => {
    const tel = cleanTel(item.phone);
    return `
      <tr>
        <td>${esc(fmtDate(item.createdAt))}</td>
        <td>${esc(item.name)}</td>
        <td><a href="tel:${esc(tel)}" style="color:#e8eef7;text-decoration:underline;">${esc(item.phone)}</a></td>
        <td>€${esc(fmtPrice(item.price))}</td>
        <td>${esc(item.car || "")}</td>
        <td>${esc(item.reg || "")}</td>
        <td>
          <button class="btn edit" data-action="edit" data-id="${esc(item.id)}">Edit</button>
          <button class="btn pdf" data-action="pdf" data-id="${esc(item.id)}">Print / PDF</button>
          <button class="btn delete" data-action="delete" data-id="${esc(item.id)}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

// ===== EVENTS =====
saveBtn.addEventListener("click", addOrUpdate);
clearBtn.addEventListener("click", resetForm);
searchEl.addEventListener("input", render);

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const item = data.find(x => x.id === id);
  if (!item) return;

  if (action === "edit") startEdit(item);
  if (action === "delete") removeItem(id);
  if (action === "pdf") printOne(item);
});

// INIT
render();