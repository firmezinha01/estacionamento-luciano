// // API do backend
// const API = "https://estacionamento-backend-cgl4.onrender.com";
// // const API = "http://localhost:3000";

// // Estado
// const state = {
//   tickets: [],
//   history: [],
//   lastReceipt: null
// };

// // Utilidades
// const fmtBRL = v => (new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })).format(v);
// const dtDisp = d => new Intl.DateTimeFormat('pt-BR', {
//   dateStyle: 'short',
//   timeStyle: 'short',
//   timeZone: 'America/Sao_Paulo'
// }).format(d);

// function parseLocalTimestamp(ts) {
//   if (!ts) return null;
//   // ISO (ex.: 2026-01-21T19:57:00.000Z ou sem Z)
//   if (typeof ts === "string" && ts.includes("T")) {
//     return new Date(ts);
//   }
//   // Local string "YYYY-MM-DD HH:mm:ss"
//   if (typeof ts === "string") {
//     const [date, time = "00:00:00"] = ts.split(" ");
//     const [y, m, d] = date.split("-").map(Number);
//     const [hh, mm, ss = 0] = time.split(":").map(Number);
//     return new Date(y, m - 1, d, hh, mm, ss);
//   }
//   // Já é Date
//   return ts instanceof Date ? ts : new Date(ts);
// }

// const $message = document.getElementById('message');
// function showMessage(msg, type = "info") {
//   if ($message) {
//     $message.textContent = msg;
//     $message.className = `muted ${type}`;
//   }
// }

// // Relógio
// function tickClock() {
//   const now = new Date();
//   const $clock = document.getElementById("clock");
//   if ($clock) $clock.textContent = dtDisp(now);
// }
// setInterval(tickClock, 1000);
// tickClock();

// // Inputs
// const $name = document.getElementById('name'),
//   $tel = document.getElementById('tel'),
//   $plate = document.getElementById('plate'),
//   $slot = document.getElementById('slot'),
//   $dailyValue = document.getElementById('dailyValue'),
//   $startTime = document.getElementById('startTime'),
//   $observacoes = document.getElementById('observacoes'),
//   $marca_modelo = document.getElementById("marca_modelo"),
//   $create = document.getElementById('createTicket'),
//   $activeList = document.getElementById('activeList'),
//   $finishTicket = document.getElementById('finishTicket'),
//   $endTime = document.getElementById('endTime'),
//   $payMethod = document.getElementById('payMethod'),
//   $historyTableBody = document.querySelector('#historyTable tbody'),
//   $confirmPayment = document.getElementById('confirmPayment');

// function toLocalString(date) {
//   const pad = n => String(n).padStart(2, '0');
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// }

// // Criar ticket
// async function createTicket() {
//   const nameField = $name, telField = $tel, plateField = $plate, marcaField = $marca_modelo, dailyValueField = $dailyValue;
//   const requiredFields = [nameField, telField, plateField, marcaField, dailyValueField];
//   let hasError = false;
//   requiredFields.forEach(f => f.classList.remove("error"));
//   requiredFields.forEach(f => { if (!f.value.trim()) { f.classList.add("error"); hasError = true; } });
//   const errorBox = document.getElementById("error-box");
//   if (hasError) { if (errorBox) errorBox.textContent = "Preencher campos obrigatórios"; return; }
//   const dailyValue = parseFloat(dailyValueField.value || '0');
//   if (isNaN(dailyValue) || dailyValue <= 0) { dailyValueField.classList.add("error"); if (errorBox) errorBox.textContent = "Preencher campos obrigatórios"; return; }

//   const start = $startTime.value ? new Date($startTime.value) : new Date();
//   const entradaStr = start.toLocaleString("sv-SE");

//   try {
//     const res = await fetch(`${API}/tickets`, {
//       method: "POST", headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         nome: nameField.value.trim(),
//         telefone: telField.value.trim(),
//         placa: plateField.value.toUpperCase().trim(),
//         vaga: ($slot.value || '').toUpperCase().trim() || null,
//         entrada: entradaStr,
//         valor_diario: dailyValue,
//         observacoes: $observacoes.value.trim(),
//         marca_modelo: marcaField.value.trim()
//       })
//     });
//     const ticket = await res.json();
//     if (ticket && ticket.id) { state.tickets.push(ticket); renderActive(); renderFinishSelect(); showMessage(`Ticket ${ticket.id} criado.`, "success"); alert("Ticket gerado com sucesso!"); }
//     else showMessage("Erro ao criar ticket", "error");
//   } catch (err) { console.error("Erro ao criar ticket:", err); showMessage("Erro ao criar ticket", "error"); }
// }
// $create?.addEventListener('click', createTicket);

// // LIMITADOR DE CARACTERES
// function limitarCaracteres(campo, max, regex = null) {
//   campo.addEventListener("input", () => {
//     // corta se passar do limite
//     if (campo.value.length > max) {
//       campo.value = campo.value.slice(0, max);
//     }
//     // aplica regex se informado (ex: telefone)
//     if (regex) {
//       campo.value = campo.value.replace(regex, "");
//     }
//   });
// }
// // Nome → 25 caracteres
// limitarCaracteres(document.getElementById("name"), 35);
// // Telefone → 14 caracteres, só números, parênteses e traços
// limitarCaracteres(document.getElementById("tel"), 14, /[^0-9()-]/g);
// // Marca/Modelo → 15 caracteres
// limitarCaracteres(document.getElementById("marca_modelo"), 15);
// // Vaga → 2 caracteres
// limitarCaracteres(document.getElementById("slot"), 2);
// // Placa → 7 caracteres
// limitarCaracteres(document.getElementById("plate"), 7);
// // Observações → 50 caracteres
// limitarCaracteres(document.getElementById("observacoes"), 50);

// const telField = document.getElementById("tel");

// telField.addEventListener("input", () => {
//   // Remove tudo que não for número
//   let valor = telField.value.replace(/\D/g, "");

//   // Limita a 11 dígitos (2 do DDD + 9 do número)
//   if (valor.length > 11) valor = valor.slice(0, 11);

//   // Aplica a máscara
//   if (valor.length > 2) {
//     valor = `(${valor.slice(0, 2)})${valor.slice(2)}`;
//   }
//   if (valor.length > 8) {
//     valor = `${valor.slice(0, 9)}-${valor.slice(9)}`;
//   }

//   telField.value = valor;
// });

// const plateField = document.getElementById("plate");

// plateField.addEventListener("input", () => {
//   // Remove espaços e caracteres inválidos
//   let valor = plateField.value.replace(/[^a-zA-Z0-9]/g, "");

//   // Limita a 7 caracteres
//   if (valor.length > 7) valor = valor.slice(0, 7);

//   // Converte para maiúsculas
//   valor = valor.toUpperCase();

//   plateField.value = valor;
// });

// // Nome → apenas letras maiúsculas, máximo 25
// const nameField = document.getElementById("name");
// nameField.addEventListener("input", () => {
//   let valor = nameField.value.replace(/[^a-zA-Z\s]/g, ""); // só letras e espaço
//   if (valor.length > 25) valor = valor.slice(0, 25);
//   nameField.value = valor.toUpperCase();
// });

// // Marca/Modelo → apenas letras maiúsculas, máximo 15
// const marcaField = document.getElementById("marca_modelo");
// marcaField.addEventListener("input", () => {
//   let valor = marcaField.value.replace(/[^a-zA-Z\s]/g, ""); // só letras e espaço
//   if (valor.length > 15) valor = valor.slice(0, 15);
//   marcaField.value = valor.toUpperCase();
// });

// // Vaga → apenas números, máximo 2
// const slotField = document.getElementById("slot");
// slotField.addEventListener("input", () => {
//   let valor = slotField.value.replace(/\D/g, ""); // só números
//   if (valor.length > 2) valor = valor.slice(0, 2);
//   slotField.value = valor;
// });

// // Render ativos
// function renderActive() {
//   $activeList.innerHTML = state.tickets.length === 0 
//     ? '<li class="no-ticket">Nenhum Ticket Ativo</li>' 
//     : '';

//   state.tickets.forEach(t => {
//     const entrada = parseLocalTimestamp(t.entrada);
//     const li = document.createElement('li');
//     li.classList.add("ticket-ativo"); // adiciona classe para estilizar
//     li.innerHTML = `
//       <strong>${t.id}</strong> ${t.nome} • ${t.marca_modelo || "--"} • 
//       Placa: ${t.placa} • Entrada: ${dtDisp(entrada)}
//     `;
//     $activeList.appendChild(li);
//   });
// }

// // Select finalização
// function renderFinishSelect() {
//   $finishTicket.innerHTML = '<option value="">Selecione...</option>';
//   state.tickets.forEach(t => {
//     const opt = document.createElement('option');
//     opt.value = t.id; opt.textContent = `${t.id} - ${t.nome} (${t.placa})`;
//     $finishTicket.appendChild(opt);
//   });
// }
// $finishTicket?.addEventListener('change', () => { $confirmPayment.disabled = !$finishTicket.value; });

// // Cálculo
// function computeCharge(t, end) {
//   const subtotal = t.valor_diario, desconto = t.desconto || 0, taxa_extra = 0;
//   return { subtotal, desconto, taxa_extra, total: subtotal - desconto + taxa_extra };
// }

// async function finalizeTicketAndHistory(method) {
//   const id = $finishTicket.value; if (!id) return;
//   const t = state.tickets.find(x => x.id == id); if (!t) return;
//   const end = $endTime.value ? new Date($endTime.value) : new Date();
//   const saidaStr = end.toLocaleString("sv-SE"); // "YYYY-MM-DD HH:mm:ss"
//   const c = computeCharge(t, end);

//   try {
//     const res = await fetch(`${API}/tickets/${id}/finalizar`, {
//       method: "PUT", headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         saida: saidaStr,
//         subtotal: c.subtotal,
//         desconto: c.desconto,
//         taxa_extra: c.taxa_extra,
//         total: c.total,
//         pagamento: method,
//         observacoes: t.observacoes ?? null,
//         marca_modelo: t.marca_modelo ?? null
//       })
//     });

//     const updated = await res.json(); // ✅ pega o ticket atualizado

//     state.history.unshift(updated);
//     renderHistoryToday();
//     showMessage(`Ticket ${id} finalizado.`, "success");

//     // 🔎 Detecta se é celular ou computador
//     const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

//     if (isMobile) {
//       // Mantém impressão via RawBT
//       const escposRes = await fetch(`${API}/gerar-ticket-escpos`, {
//         method: "POST", headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(updated)
//       });
//       const escpos = await escposRes.text();
//       window.open("rawbt://print?data=" + encodeURIComponent(escpos));
//     } else {
//       // Impressão via cabo no PC
//       await fetch(`${API}/imprimir-ticket`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(updated)
//       });
//     }

//   } catch (err) {
//     console.error("Erro ao finalizar:", err);
//     showMessage("Erro ao finalizar", "error");
//   }

//   state.tickets = state.tickets.filter(x => x.id != id);
//   renderActive();
//   renderFinishSelect();
// }

// // Histórico do dia
// function renderHistoryToday() {
//   const today = new Date().toLocaleDateString("pt-BR");
//   const tbody = document.querySelector("#historyTable tbody");
//   tbody.innerHTML = "";

//   const filtered = state.history.filter(h => {
//     const entrada = parseLocalTimestamp(h.entrada);
//     return entrada.toLocaleDateString("pt-BR") === today;
//   });

//   if (filtered.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="15">Sem movimentos hoje.</td></tr>';
//     return;
//   }

//   filtered.forEach((h, index) => {
//     const entrada = parseLocalTimestamp(h.entrada), saida = parseLocalTimestamp(h.saida);
//     const tr = document.createElement("tr");
//     tr.innerHTML = `
//       <td>${index + 1}</td>
//       <td>${h.nome || "--"}</td>
//       <td>${h.telefone || "--"}</td>
//       <td>${h.marca_modelo || "--"}</td>
//       <td>${h.placa || "--"}</td>
//       <td>${h.vaga || "--"}</td>
//       <td>${dtDisp(entrada)}</td>
//       <td>${saida ? dtDisp(saida) : "--"}</td>
//       <td>${fmtBRL(h.subtotal)}</td>
//       <td>${fmtBRL(h.desconto)}</td>
//       <td>${fmtBRL(h.taxa_extra)}</td>
//       <td>${fmtBRL(h.total)}</td>
//       <td>${h.pagamento || "--"}</td>
//       <td>${h.status || "--"}</td>
//       <td>${h.observacoes || "--"}</td>
//       <td><button class="btn-imprimir" onclick="reimprimirTicket(${h.id})">🖨️ Imprimir</button></td>
//     `;
//     tbody.appendChild(tr);
//   });
// }

// // Histórico por data
// function renderHistoryByDate(dateStr) {
//   const tbody = document.querySelector("#historyTableByDate tbody");
//   tbody.innerHTML = "";

//   if (!dateStr) {
//     tbody.innerHTML = '<tr><td colspan="15">Selecione uma data.</td></tr>';
//     return;
//   }

//   // Corrige: monta a data local sem UTC
//   const [y, m, d] = dateStr.split("-").map(Number);
//   const selectedDate = new Date(y, m - 1, d).toLocaleDateString("pt-BR");

//   const filtered = state.history.filter(h => {
//     const entrada = parseLocalTimestamp(h.entrada);
//     return entrada.toLocaleDateString("pt-BR") === selectedDate;
//   });

//   if (filtered.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="15">Nenhum histórico encontrado nesta data.</td></tr>';
//     return;
//   }

//   filtered.forEach((h, index) => {
//     const entrada = parseLocalTimestamp(h.entrada), saida = parseLocalTimestamp(h.saida);
//     const tr = document.createElement("tr");
//     tr.innerHTML = `
//       <td>${index + 1}</td>
//       <td>${h.nome || "--"}</td>
//       <td>${h.telefone || "--"}</td>
//       <td>${h.marca_modelo || "--"}</td>
//       <td>${h.placa}</td>
//       <td>${h.vaga || "--"}</td>
//       <td>${dtDisp(entrada)}</td>
//       <td>${saida ? dtDisp(saida) : "--"}</td>
//       <td>${fmtBRL(h.subtotal)}</td>
//       <td>${fmtBRL(h.desconto)}</td>
//       <td>${fmtBRL(h.taxa_extra)}</td>
//       <td>${fmtBRL(h.total)}</td>
//       <td>${h.pagamento || "--"}</td>
//       <td>${h.status || "--"}</td>
//       <td>${h.observacoes || "--"}</td>
//       <td><button class="btn-imprimir" onclick="reimprimirTicket(${h.id})">🖨️ Imprimir</button></td>
//     `;
//     tbody.appendChild(tr);
//   });
// }

// // Botão "Gerar histórico"
// document.getElementById("generateHistory").addEventListener("click", () => {
//   const dateStr = document.getElementById("historyDate").value;
//   renderHistoryByDate(dateStr);
// });

// // Botão "Limpar histórico do dia"
// const $clearHistory = document.getElementById("clearHistory");
// $clearHistory?.addEventListener("click", () => {
//   if (!confirm("Deseja limpar o histórico da tela? Isso não apaga do sistema.")) return;
//   state.history = [];
//   renderHistoryToday();
//   showMessage("Histórico da tela limpo com sucesso.", "success");
// });

// // Inicializa histórico do dia ao carregar
// renderHistoryToday();

// // Inicialização
// function initDefaults() {
//   if ($dailyValue) $dailyValue.value = $dailyValue.value || '30.00';
//   if ($payMethod) $payMethod.value = $payMethod.value || 'pix';
//   loadTickets();
//   loadHistory();
// }
// document.addEventListener('DOMContentLoaded', initDefaults);

// // Carregar tickets ativos
// async function loadTickets() {
//   try {
//     const res = await fetch(`${API}/tickets`);
//     state.tickets = await res.json();
//     renderActive();
//     renderFinishSelect();
//   } catch (err) {
//     showMessage("Erro ao carregar tickets", "error");
//   }
// }

// // Carregar histórico
// async function loadHistory() {
//   try {
//     const res = await fetch(`${API}/tickets/history`);
//     state.history = await res.json();

//     // Atualiza histórico do dia
//     renderHistoryToday();

//     // Se houver uma data selecionada, atualiza também a tabela por data
//     const dateStr = document.getElementById("historyDate")?.value;
//     if (dateStr) renderHistoryByDate(dateStr);
//   } catch (err) {
//     showMessage("Erro ao carregar histórico", "error");
//   }
// }

// // Conectar botão Confirmar pagamento
// $confirmPayment?.addEventListener('click', () => {
//   const method = $payMethod.value || 'pix';
//   finalizeTicketAndHistory(method);
// });

// // ================= GERAR PDF POR DATA =================
// const $pdfStart = document.getElementById('pdfStart');
// const $pdfEnd = document.getElementById('pdfEnd');
// const $generatePdf = document.getElementById('generatePdf');

// $generatePdf?.addEventListener('click', () => {
//   const inicio = $pdfStart.value;
//   const fim = $pdfEnd.value;
//   if (!inicio || !fim) {
//     showMessage("Selecione a data inicial e final para gerar o PDF", "error");
//     return;
//   }
//   const url = `${API}/tickets/pdf?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
//   window.open(url, "_blank");
// });


// API do backend
const API = "https://estacionamento-backend-cgl4.onrender.com";
// const API = "http://localhost:3000";

// Estado
const state = {
  tickets: [],
  history: [],
  lastReceipt: null
};

// Utilidades
const fmtBRL = v => (new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })).format(v);
const dtDisp = d => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
}).format(d);

function parseLocalTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === "string" && ts.includes("T")) {
    return new Date(ts);
  }
  if (typeof ts === "string") {
    const [date, time = "00:00:00"] = ts.split(" ");
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm, ss = 0] = time.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, ss);
  }
  return ts instanceof Date ? ts : new Date(ts);
}

const $message = document.getElementById('message');
function showMessage(msg, type = "info") {
  if ($message) {
    $message.textContent = msg;
    $message.className = `muted ${type}`;
  }
}

// 🔵 IMPRESSÃO NO NAVEGADOR (PC)
function imprimirTicket(ticket) {
  const conteudo = `
    <div style="font-family: monospace; width: 260px; padding: 10px;">
      <h3 style="text-align:center; margin:0;">LS Estacionamento</h3>
      <div style="text-align:center;">------------------------------</div>

      <div>Data: ${dtDisp(parseLocalTimestamp(ticket.entrada))}</div>
      <div>Cliente: ${ticket.nome}</div>
      <div style="font-size:18px; font-weight:bold;">Placa: ${ticket.placa}</div>
      <div style="font-size:18px; font-weight:bold;">Valor: R$ ${ticket.total.toFixed(2)}</div>

      <div style="text-align:center;">------------------------------</div>
      <div style="text-align:center;">Obrigado pela preferência!</div>
      <div style="text-align:center;">Guarde este comprovante.</div>
    </div>
  `;

  const janela = window.open("", "_blank", "width=300,height=600");
  janela.document.write(conteudo);
  janela.document.close();
  janela.focus();
  janela.print();
  janela.close();
}

// Relógio
function tickClock() {
  const now = new Date();
  const $clock = document.getElementById("clock");
  if ($clock) $clock.textContent = dtDisp(now);
}
setInterval(tickClock, 1000);
tickClock();

// Inputs
const $name = document.getElementById('name'),
  $tel = document.getElementById('tel'),
  $plate = document.getElementById('plate'),
  $slot = document.getElementById('slot'),
  $dailyValue = document.getElementById('dailyValue'),
  $startTime = document.getElementById('startTime'),
  $observacoes = document.getElementById('observacoes'),
  $marca_modelo = document.getElementById("marca_modelo"),
  $create = document.getElementById('createTicket'),
  $activeList = document.getElementById('activeList'),
  $finishTicket = document.getElementById('finishTicket'),
  $endTime = document.getElementById('endTime'),
  $payMethod = document.getElementById('payMethod'),
  $historyTableBody = document.querySelector('#historyTable tbody'),
  $confirmPayment = document.getElementById('confirmPayment');

function toLocalString(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Criar ticket
async function createTicket() {
  const nameField = $name, telField = $tel, plateField = $plate, marcaField = $marca_modelo, dailyValueField = $dailyValue;
  const requiredFields = [nameField, telField, plateField, marcaField, dailyValueField];
  let hasError = false;
  requiredFields.forEach(f => f.classList.remove("error"));
  requiredFields.forEach(f => { if (!f.value.trim()) { f.classList.add("error"); hasError = true; } });
  const errorBox = document.getElementById("error-box");
  if (hasError) { if (errorBox) errorBox.textContent = "Preencher campos obrigatórios"; return; }
  const dailyValue = parseFloat(dailyValueField.value || '0');
  if (isNaN(dailyValue) || dailyValue <= 0) { dailyValueField.classList.add("error"); if (errorBox) errorBox.textContent = "Preencher campos obrigatórios"; return; }

  const start = $startTime.value ? new Date($startTime.value) : new Date();
  const entradaStr = start.toLocaleString("sv-SE");

  try {
    const res = await fetch(`${API}/tickets`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nameField.value.trim(),
        telefone: telField.value.trim(),
        placa: plateField.value.toUpperCase().trim(),
        vaga: ($slot.value || '').toUpperCase().trim() || null,
        entrada: entradaStr,
        valor_diario: dailyValue,
        observacoes: $observacoes.value.trim(),
        marca_modelo: marcaField.value.trim()
      })
    });
    const ticket = await res.json();
    if (ticket && ticket.id) { state.tickets.push(ticket); renderActive(); renderFinishSelect(); showMessage(`Ticket ${ticket.id} criado.`, "success"); alert("Ticket gerado com sucesso!"); }
    else showMessage("Erro ao criar ticket", "error");
  } catch (err) { console.error("Erro ao criar ticket:", err); showMessage("Erro ao criar ticket", "error"); }
}
$create?.addEventListener('click', createTicket);

// LIMITADOR DE CARACTERES
function limitarCaracteres(campo, max, regex = null) {
  campo.addEventListener("input", () => {
    if (campo.value.length > max) campo.value = campo.value.slice(0, max);
    if (regex) campo.value = campo.value.replace(regex, "");
  });
}
limitarCaracteres(document.getElementById("name"), 35);
limitarCaracteres(document.getElementById("tel"), 14, /[^0-9()-]/g);
limitarCaracteres(document.getElementById("marca_modelo"), 15);
limitarCaracteres(document.getElementById("slot"), 2);
limitarCaracteres(document.getElementById("plate"), 7);
limitarCaracteres(document.getElementById("observacoes"), 50);

const telField = document.getElementById("tel");
telField.addEventListener("input", () => {
  let valor = telField.value.replace(/\D/g, "");
  if (valor.length > 11) valor = valor.slice(0, 11);
  if (valor.length > 2) valor = `(${valor.slice(0, 2)})${valor.slice(2)}`;
  if (valor.length > 8) valor = `${valor.slice(0, 9)}-${valor.slice(9)}`;
  telField.value = valor;
});

const plateField = document.getElementById("plate");
plateField.addEventListener("input", () => {
  let valor = plateField.value.replace(/[^a-zA-Z0-9]/g, "");
  if (valor.length > 7) valor = valor.slice(0, 7);
  plateField.value = valor.toUpperCase();
});

// Nome → apenas letras maiúsculas, máximo 25
const nameField = document.getElementById("name");
nameField.addEventListener("input", () => {
  let valor = nameField.value.replace(/[^a-zA-Z\s]/g, "");
  if (valor.length > 25) valor = valor.slice(0, 25);
  nameField.value = valor.toUpperCase();
});

// Marca/Modelo → apenas letras maiúsculas, máximo 15
const marcaField = document.getElementById("marca_modelo");
marcaField.addEventListener("input", () => {
  let valor = marcaField.value.replace(/[^a-zA-Z\s]/g, "");
  if (valor.length > 15) valor = valor.slice(0, 15);
  marcaField.value = valor.toUpperCase();
});

// Vaga → apenas números, máximo 2
const slotField = document.getElementById("slot");
slotField.addEventListener("input", () => {
  let valor = slotField.value.replace(/\D/g, "");
  if (valor.length > 2) valor = valor.slice(0, 2);
  slotField.value = valor;
});

// Render ativos
function renderActive() {
  $activeList.innerHTML = state.tickets.length === 0 
    ? '<li class="no-ticket">Nenhum Ticket Ativo</li>' 
    : '';

  state.tickets.forEach(t => {
    const entrada = parseLocalTimestamp(t.entrada);
    const li = document.createElement('li');
    li.classList.add("ticket-ativo");
    li.innerHTML = `
      <strong>${t.id}</strong> ${t.nome} • ${t.marca_modelo || "--"} • 
      Placa: ${t.placa} • Entrada: ${dtDisp(entrada)}
    `;
    $activeList.appendChild(li);
  });
}

// Select finalização
function renderFinishSelect() {
  $finishTicket.innerHTML = '<option value="">Selecione...</option>';
  state.tickets.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = `${t.id} - ${t.nome} (${t.placa})`;
    $finishTicket.appendChild(opt);
  });
}
$finishTicket?.addEventListener('change', () => { $confirmPayment.disabled = !$finishTicket.value; });

// Cálculo
function computeCharge(t, end) {
  const subtotal = t.valor_diario, desconto = t.desconto || 0, taxa_extra = 0;
  return { subtotal, desconto, taxa_extra, total: subtotal - desconto + taxa_extra };
}

// FINALIZAR TICKET (IMPRESSÃO CORRIGIDA)
async function finalizeTicketAndHistory(method) {
  const id = $finishTicket.value; if (!id) return;
  const t = state.tickets.find(x => x.id == id); if (!t) return;
  const end = $endTime.value ? new Date($endTime.value) : new Date();
  const saidaStr = end.toLocaleString("sv-SE");
  const c = computeCharge(t, end);

  try {
    const res = await fetch(`${API}/tickets/${id}/finalizar`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saida: saidaStr,
        subtotal: c.subtotal,
        desconto: c.desconto,
        taxa_extra: c.taxa_extra,
        total: c.total,
        pagamento: method,
        observacoes: t.observacoes ?? null,
        marca_modelo: t.marca_modelo ?? null
      })
    });

    const updated = await res.json();

    state.history.unshift(updated);
    renderHistoryToday();
    showMessage(`Ticket ${id} finalizado.`, "success");

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      const escposRes = await fetch(`${API}/gerar-ticket-escpos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      const escpos = await escposRes.text();
      window.open("rawbt://print?data=" + encodeURIComponent(escpos));
    } else {
      imprimirTicket(updated);
    }

  } catch (err) {
    console.error("Erro ao finalizar:", err);
    showMessage("Erro ao finalizar", "error");
  }

  state.tickets = state.tickets.filter(x => x.id != id);
  renderActive();
  renderFinishSelect();
}

// Histórico do dia
function renderHistoryToday() {
  const today = new Date().toLocaleDateString("pt-BR");
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";

  const filtered = state.history.filter(h => {
    const entrada = parseLocalTimestamp(h.entrada);
    return entrada.toLocaleDateString("pt-BR") === today;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="15">Sem movimentos hoje.</td></tr>';
    return;
  }

  filtered.forEach((h, index) => {
    const entrada = parseLocalTimestamp(h.entrada), saida = parseLocalTimestamp(h.saida);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${h.nome || "--"}</td>
      <td>${h.telefone || "--"}</td>
      <td>${h.marca_modelo || "--"}</td>
      <td>${h.placa || "--"}</td>
      <td>${h.vaga || "--"}</td>
      <td>${dtDisp(entrada)}</td>
      <td>${saida ? dtDisp(saida) : "--"}</td>
      <td>${fmtBRL(h.subtotal)}</td>
      <td>${fmtBRL(h.desconto)}</td>
      <td>${fmtBRL(h.taxa_extra)}</td>
      <td>${fmtBRL(h.total)}</td>
      <td>${h.pagamento || "--"}</td>
      <td>${h.status || "--"}</td>
      <td>${h.observacoes || "--"}</td>
      <td><button class="btn-imprimir" onclick="reimprimirTicket(${h.id})">🖨️ Imprimir</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// Histórico por data
function renderHistoryByDate(dateStr) {
  const tbody = document.querySelector("#historyTableByDate tbody");
  tbody.innerHTML = "";

  if (!dateStr) {
    tbody.innerHTML = '<tr><td colspan="15">Selecione uma data.</td></tr>';
    return;
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const selectedDate = new Date(y, m - 1, d).toLocaleDateString("pt-BR");

  const filtered = state.history.filter(h => {
    const entrada = parseLocalTimestamp(h.entrada);
    return entrada.toLocaleDateString("pt-BR") === selectedDate;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="15">Nenhum histórico encontrado nesta data.</td></tr>';
    return;
  }

  filtered.forEach((h, index) => {
    const entrada = parseLocalTimestamp(h.entrada), saida = parseLocalTimestamp(h.saida);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${h.nome || "--"}</td>
      <td>${h.telefone || "--"}</td>
      <td>${h.marca_modelo || "--"}</td>
      <td>${h.placa}</td>
      <td>${h.vaga || "--"}</td>
      <td>${dtDisp(entrada)}</td>
      <td>${saida ? dtDisp(saida) : "--"}</td>
      <td>${fmtBRL(h.subtotal)}</td>
      <td>${fmtBRL(h.desconto)}</td>
      <td>${fmtBRL(h.taxa_extra)}</td>
      <td>${fmtBRL(h.total)}</td>
      <td>${h.pagamento || "--"}</td>
      <td>${h.status || "--"}</td>
      <td>${h.observacoes || "--"}</td>
      <td><button class="btn-imprimir" onclick="reimprimirTicket(${h.id})">🖨️ Imprimir</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// Botão "Gerar histórico"
document.getElementById("generateHistory").addEventListener("click", () => {
  const dateStr = document.getElementById("historyDate").value;
  renderHistoryByDate(dateStr);
});

// Botão "Limpar histórico do dia"
const $clearHistory = document.getElementById("clearHistory");
$clearHistory?.addEventListener("click", () => {
  if (!confirm("Deseja limpar o histórico da tela? Isso não apaga do sistema.")) return;
  state.history = [];
  renderHistoryToday();
  showMessage("Histórico da tela limpo com sucesso.", "success");
});

// Inicializa histórico do dia ao carregar
renderHistoryToday();

// Inicialização
function initDefaults() {
  if ($dailyValue) $dailyValue.value = $dailyValue.value || '30.00';
  if ($payMethod) $payMethod.value = $payMethod.value || 'pix';
  loadTickets();
  loadHistory();
}
document.addEventListener('DOMContentLoaded', initDefaults);

// Carregar tickets ativos
async function loadTickets() {
  try {
    const res = await fetch(`${API}/tickets`);
    state.tickets = await res.json();
    renderActive();
    renderFinishSelect();
  } catch (err) {
    showMessage("Erro ao carregar tickets", "error");
  }
}

// Carregar histórico
async function loadHistory() {
  try {
    const res = await fetch(`${API}/tickets/history`);
    state.history = await res.json();

    // Atualiza histórico do dia
    renderHistoryToday();

    // Se houver uma data selecionada, atualiza também a tabela por data
    const dateStr = document.getElementById("historyDate")?.value;
    if (dateStr) renderHistoryByDate(dateStr);
  } catch (err) {
    showMessage("Erro ao carregar histórico", "error");
  }
}

// Conectar botão Confirmar pagamento
$confirmPayment?.addEventListener('click', () => {
  const method = $payMethod.value || 'pix';
  finalizeTicketAndHistory(method);
});

// ================= GERAR PDF POR DATA =================
const $pdfStart = document.getElementById('pdfStart');
const $pdfEnd = document.getElementById('pdfEnd');
const $generatePdf = document.getElementById('generatePdf');

$generatePdf?.addEventListener('click', () => {
  const inicio = $pdfStart.value;
  const fim = $pdfEnd.value;
  if (!inicio || !fim) {
    showMessage("Selecione a data inicial e final para gerar o PDF", "error");
    return;
  }
  const url = `${API}/tickets/pdf?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
  window.open(url, "_blank");
});