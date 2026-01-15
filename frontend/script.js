// API do backend
const API = "https://estacionamento-backend-cgl4.onrender.com";

// Estado
const state = {
  tickets: [],
  history: [],
  lastReceipt: null
};

// Utilidades
const fmtBRL = v => (new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })).format(v);

// Força timezone São Paulo
const dtDisp = d => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
}).format(d);

function parseLocalTimestamp(ts) {
  if (!ts) return null;
  if (ts.includes("T")) {
    return new Date(ts);
  }
  const [date, time] = ts.split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss);
}

// Feedback
const $message = document.getElementById('message');
function showMessage(msg, type = "info") {
  if ($message) {
    $message.textContent = msg;
    $message.className = `muted ${type}`;
  }
}

// Relógio
function tickClock() {
  const now = new Date();
  const $clock = document.getElementById("clock");
  if ($clock) {
    $clock.textContent = dtDisp(now);
  }
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
  $observacoes = document.getElementById('observacoes'), // novo campo
  $create = document.getElementById('createTicket'),
  $activeList = document.getElementById('activeList'),
  $finishTicket = document.getElementById('finishTicket'),
  $endTime = document.getElementById('endTime'),
  $payMethod = document.getElementById('payMethod'),
  $lostTicket = document.getElementById('lostTicket'),
  $historyTableBody = document.querySelector('#historyTable tbody'),
  $confirmPayment = document.getElementById('confirmPayment'); // botão confirmar pagamento

function toLocalString(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Criar ticket
async function createTicket() {
  const name = ($name.value || '').trim();
  const tel = ($tel.value || '').trim();
  const plate = ($plate.value || '').toUpperCase().trim();
  const slot = ($slot.value || '').toUpperCase().trim();
  const dailyValue = parseFloat($dailyValue.value || '0');
  const observacoes = ($observacoes.value || '').trim();

  if (!name || !tel || !plate || !slot || !dailyValue) {
    showMessage("Preencha todos os campos obrigatórios", "error"); return;
  }
  const start = $startTime.value ? new Date($startTime.value) : new Date();
  const entradaStr = toLocalString(start);

  try {
    const res = await fetch(`${API}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: name, telefone: tel, placa: plate, vaga: slot,
        entrada: entradaStr, valor_diario: dailyValue,
        observacoes
      })
    });
    const ticket = await res.json();
    state.tickets.push(ticket);
    renderActive(); renderFinishSelect();
    showMessage(`Ticket ${ticket.id} criado.`, "success");
  } catch (err) { showMessage("Erro ao criar ticket", "error"); }
}
$create?.addEventListener('click', createTicket);

// Render ativos
function renderActive() {
  $activeList.innerHTML = '';
  if (state.tickets.length === 0) { $activeList.innerHTML = '<li>Nenhum ticket ativo.</li>'; return; }
  state.tickets.forEach(t => {
    const li = document.createElement('li');
    const entrada = new Date(t.entrada);
    li.innerHTML = `
      <strong>${t.id}</strong> • ${t.nome} • Placa: ${t.placa} • Entrada: ${dtDisp(entrada)}
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

// ✅ Habilitar botão Confirmar pagamento quando um ticket for selecionado
$finishTicket?.addEventListener('change', () => {
  if ($finishTicket.value) {
    $confirmPayment.disabled = false;
  } else {
    $confirmPayment.disabled = true;
  }
});

// Cálculo
function computeCharge(t, end) {
  const subtotal = t.valor_diario;
  const desconto = t.desconto || 0;
  const taxa_extra = ($lostTicket.value === 'yes') ? subtotal : 0;
  const total = subtotal - desconto + taxa_extra;
  return { subtotal, desconto, taxa_extra, total };
}

// Finalizar e imprimir
async function finalizeTicketAndHistory(method){
  const id=$finishTicket.value; if(!id) return;
  const t=state.tickets.find(x=>x.id==id); if(!t) return;
  const end=$endTime.value?new Date($endTime.value):new Date();
  const saidaStr=new Date(end).toISOString().slice(0,19).replace('T',' ');
  const c=computeCharge(t,end);

  try{
    const res=await fetch(`${API}/tickets/${id}/finalizar`,{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        saida:saidaStr,
        subtotal:c.subtotal,
        desconto:c.desconto,
        taxa_extra:c.taxa_extra,
        total:c.total,
        pagamento:method
      })
    });
    const updated=await res.json();

    state.history.unshift(updated);
    renderHistory();
    showMessage(`Ticket ${id} finalizado.`,"success");

    // ✅ Já direciona para impressão (RawBT e ESC/POS Service)
    try {
      const printRes = await fetch(`${API}/gerar-ticket-escpos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      const escpos = await printRes.text();

      // RawBT
      const rawbtUrl = `rawbt://print?text=${encodeURIComponent(escpos)}`;
      window.open(rawbtUrl);

      // Serviço de Impressão ESC/POS
      // const escposUrl = `escpos://print?data=${encodeURIComponent(escpos)}`;
      // window.open(escposUrl);

      showMessage("Comprovante enviado para impressão.", "success");
    } catch (err) {
      console.error("Erro ao gerar comprovante:", err);
      showMessage("Erro ao gerar comprovante", "error");
    }

  }catch(err){ 
    console.error("Erro ao finalizar:", err);
    showMessage("Erro ao finalizar","error"); 
  }

  state.tickets=state.tickets.filter(x=>x.id!=id);
  renderActive(); renderFinishSelect();
}

// Histórico
function renderHistory() {
  $historyTableBody.innerHTML = '';
  if (state.history.length === 0) {
    $historyTableBody.innerHTML = '<tr><td colspan="12">Sem movimentos.</td></tr>'; return;
  }
  state.history.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${h.id}</td><td>${h.nome}</td><td>${h.telefone}</td><td>${h.placa}</td>
      <td>${dtDisp(new Date(h.entrada))}</td>
      <td>${dtDisp(new Date(h.saida))}</td>
      <td>${fmtBRL(h.subtotal)}</td><td>${fmtBRL(h.desconto)}</td>
      <td>${fmtBRL(h.taxa_extra)}</td><td>${fmtBRL(h.total)}</td>
      <td>${h.pagamento}</td><td>${h.status}</td>
      <td>${h.observacoes || "--"}</td>`;
    $historyTableBody.appendChild(tr);
  });
}

const $clearHistory = document.getElementById('clearHistory');

$clearHistory?.addEventListener('click', async () => {
  if (!confirm("Tem certeza que deseja limpar todo o histórico?")) return;

  try {
    const res = await fetch(`${API}/tickets/history`, { method: "DELETE" });
    if (res.ok) {
      state.history = [];
      renderHistory();
      showMessage("Histórico limpo com sucesso.", "success");
    } else {
      showMessage("Erro ao limpar histórico.", "error");
    }
  } catch (err) {
    console.error(err);
    showMessage("Erro de conexão ao limpar histórico.", "error");
  }
});

// Inicialização
function initDefaults() {
  if ($dailyValue) $dailyValue.value = $dailyValue.value || '30.00';
  if ($payMethod) $payMethod.value = $payMethod.value || 'pix';
  loadTickets();
  loadHistory();
}
document.addEventListener('DOMContentLoaded', initDefaults);

// Carregar tickets ativos do backend
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

// Carregar histórico de tickets pagos
async function loadHistory() {
  try {
    const res = await fetch(`${API}/tickets/history`);
    state.history = await res.json();
    renderHistory();
  } catch (err) {
    showMessage("Erro ao carregar histórico", "error");
  }
}

// 🔑 Conectar botão Confirmar pagamento
$confirmPayment?.addEventListener('click', () => {
  const method = $payMethod.value || 'pix';
  finalizeTicketAndHistory(method);
});

// ================= GERAR PDF POR DATA =================
// Botão para gerar relatório em PDF
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
  window.open(url, "_blank"); // abre o PDF em nova aba
});
