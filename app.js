const KEY = "client-archive-v1";

const form = document.getElementById("form");
const clearFormBtn = document.getElementById("clearForm");
const wipeAllBtn = document.getElementById("wipeAll");
const exportCsvBtn = document.getElementById("exportCsv");
const exportJsonBtn = document.getElementById("exportJson");
const printBtn = document.getElementById("printBtn");
const searchInput = document.getElementById("search");
const tbody = document.getElementById("tbody");

const nameEl = document.getElementById("name");
const phoneEl = document.getElementById("phone");
const carEl = document.getElementById("car");
const regEl = document.getElementById("reg");

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function saveAll(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
function nowISO() { return new Date().toISOString(); }
function prettyDate(iso) { return new Date(iso).toLocaleString(); }

function validIrishReg(value) {
  const v = value.trim().toUpperCase();
  // Examples: 231-D-12345, 12-KE-3456, 06-C-123
  const re = /^(\d{2}|\d{3})-[A-Z]{1,2}-\d{1,6}$/;
  return re.test(v);
}

function normalize(str) { return (str || "").toString().trim().toLowerCase(); }
function matches(item, q) {
  if (!q) return true;
  const hay = [item.name, item.phone, item.car, item.reg, item.date]
    .map(normalize).join(" ");
  return hay.includes(q);
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function render() {
  const items = loadAll();
  const q = normalize(searchInput.value);
  const filtered = items.filter(it => matches(it, q));

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6"><small>No results</small></td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const it of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><small>${prettyDate(it.date)}</small></td>
      <td><b>${escapeHtml(it.name)}</b></td>
      <td>${escapeHtml(it.phone)}</td>
      <td>${escapeHtml(it.car)}</td>
      <td><b>${escapeHtml(it.reg)}</b></td>
      <td style="white-space:nowrap">
        <button class="iconBtn" data-del="${it.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      const next = loadAll().filter(x => x.id !== id);
      saveAll(next);
      render();
    });
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const item = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    date: nowISO(),
    name: nameEl.value.trim(),
    phone: phoneEl.value.trim(),
    car: carEl.value.trim(),
    reg: regEl.value.trim().toUpperCase()
  };

  if (!validIrishReg(item.reg)) {
    alert("Registration format looks wrong.\nExample: 231-D-12345");
    regEl.focus();
    return;
  }

  const items = loadAll();
  items.unshift(item);
  saveAll(items);

  form.reset();
  nameEl.focus();
  render();
});

clearFormBtn.addEventListener("click", () => {
  form.reset();
  nameEl.focus();
});

wipeAllBtn.addEventListener("click", () => {
  if (!confirm("Delete ALL saved clients?")) return;
  saveAll([]);
  render();
});

searchInput.addEventListener("input", render);
printBtn.addEventListener("click", () => window.print());

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvSafe(v) {
  const s = (v ?? "").toString();
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
  return s;
}

exportJsonBtn.addEventListener("click", () => {
  download("clients.json", JSON.stringify(loadAll(), null, 2), "application/json");
});

exportCsvBtn.addEventListener("click", () => {
  const items = loadAll();
  const header = ["date","name","phone","car","reg"];
  const rows = items.map(it => [it.date,it.name,it.phone,it.car,it.reg].map(csvSafe).join(","));
  const csv = header.join(",") + "\n" + rows.join("\n");
  download("clients.csv", csv, "text/csv");
});

render();