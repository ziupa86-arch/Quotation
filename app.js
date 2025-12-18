const KEY = "client-archive-v2";

const form = document.getElementById("form");
const tbody = document.getElementById("tbody");
const search = document.getElementById("search");

const nameEl = document.getElementById("name");
const phoneEl = document.getElementById("phone");
const carEl = document.getElementById("car");
const regEl = document.getElementById("reg");
const priceEl = document.getElementById("price");

const clearFormBtn = document.getElementById("clearForm");
const wipeAllBtn = document.getElementById("wipeAll");
const exportCsvBtn = document.getElementById("exportCsv");
const printBtn = document.getElementById("printBtn");

function load() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
function formatDate(d) {
  return new Date(d).toLocaleString();
}
function euro(v) {
  return v ? `€${v.toFixed(2)}` : "—";
}

function render() {
  const q = search.value.toLowerCase();
  const data = load().filter(c =>
    `${c.name} ${c.phone} ${c.car} ${c.reg}`.toLowerCase().includes(q)
  );

  tbody.innerHTML = "";
  data.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(c.date)}</td>
      <td><b>${c.name}</b></td>
      <td><a class="phone" href="tel:${c.phone.replace(/\s+/g,"")}">${c.phone}</a></td>
      <td><b>${euro(c.price)}</b></td>
      <td>${c.car}</td>
      <td>${c.reg}</td>
      <td><button data-id="${c.id}">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button").forEach(b=>{
    b.onclick=()=>{
      save(load().filter(x=>x.id!==b.dataset.id));
      render();
    };
  });
}

form.onsubmit = e => {
  e.preventDefault();

  const item = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    name: nameEl.value.trim(),
    phone: phoneEl.value.trim(),
    car: carEl.value.trim(),
    reg: regEl.value.trim().toUpperCase(),
    price: priceEl.value ? Number(priceEl.value) : 0
  };

  const data = load();
  data.unshift(item);
  save(data);

  form.reset();
  render();
};

clearFormBtn.onclick = () => form.reset();
wipeAllBtn.onclick = () => { if(confirm("Delete all?")){ save([]); render(); } };
search.oninput = render;
printBtn.onclick = () => window.print();

exportCsvBtn.onclick = () => {
  const rows = load().map(c =>
    `"${c.date}","${c.name}","${c.phone}","${c.price}","${c.car}","${c.reg}"`
  );
  const csv = "Date,Name,Phone,Price,Car,Reg\n" + rows.join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = "clients.csv";
  a.click();
};

render();