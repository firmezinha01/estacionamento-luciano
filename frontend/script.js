// API do backend
const API = "https://estaciona-facil-l8lj.onrender.com";

// Estado da aplicação
const state = {
  tickets: [],
  history: [],
  seq: 1,
  lastReceipt: null,
  currentPayment: null
};

// Utilidades
const fmtBRL = v => (new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})).format(v);
const pad2 = n => String(n).padStart(2,'0');
const dtDisp = d => new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(d);
function diffMinutes(a,b){ return Math.max(0, Math.round((b-a)/60000)); }
function ceilDiv(a,b){ return Math.ceil(a/b); }

// Feedback
const $message = document.getElementById('message');
function showMessage(msg, type="info"){
  if($message){
    $message.textContent = msg;
    $message.className = `muted ${type}`;
  }
}

// Relógio
function tickClock(){
  const now = new Date();
  const $clock = document.getElementById('clock');
  if ($clock) {
    $clock.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  }
  requestAnimationFrame(()=>setTimeout(tickClock,500));
}
tickClock();

// Inputs
const $plate=document.getElementById('plate'),
      $slot=document.getElementById('slot'),
      $note=document.getElementById('note'),
      $startTime=document.getElementById('startTime'),
      $create=document.getElementById('createTicket'),
      $rateHour=document.getElementById('rateHour'),
      $minFraction=document.getElementById('minFraction'),
      $fraction=document.getElementById('fraction'),
      $lostFee=document.getElementById('lostFee'),
      $discount=document.getElementById('discount'),
      $dailyMax=document.getElementById('dailyMax'),
      $activeList=document.getElementById('activeList'),
      $finishTicket=document.getElementById('finishTicket'),
      $endTime=document.getElementById('endTime'),
      $payMethod=document.getElementById('payMethod'),
      $lostTicket=document.getElementById('lostTicket'),
      $calcArea=document.getElementById('calcArea'),
      $pixArea=document.getElementById('pixArea'),
      $cardArea=document.getElementById('cardArea'),
      $cashArea=document.getElementById('cashArea'),
      $confirmPayment=document.getElementById('confirmPayment'),
      $printReceipt=document.getElementById('printReceipt'),
      $cancelPayment=document.getElementById('cancelPayment'),
      $historyTableBody=document.querySelector('#historyTable tbody');

// Criação de ticket
function createTicket(){
  const plate=($plate.value||'').toUpperCase().trim();
  const slot=($slot.value||'').toUpperCase().trim();
  if(!plate||!slot){ showMessage('Informe placa e vaga.','error'); return; }
  const start=$startTime.value?new Date($startTime.value):new Date();
  const id=String(state.seq++).padStart(6,'0');
  state.tickets.push({id,plate,slot,note:$note.value.trim(),start,status:'ativo'});
  $plate.value=$slot.value=$note.value=$startTime.value='';
  renderActive(); 
  renderFinishSelect();
  showMessage(`Ticket ${id} criado para placa ${plate}.`,'success');
}
$create?.addEventListener('click',createTicket);
document.addEventListener('keydown', (e)=>{
  if(e.ctrlKey && e.key === 'Enter'){ createTicket(); }
});

// Renderização de ativos
function renderActive(){
  if(!$activeList) return;
  $activeList.innerHTML='';
  const ativos = state.tickets;
  if(ativos.length===0){
    $activeList.innerHTML='<li>Nenhum ticket ativo.</li>';
    return;
  }
  ativos.forEach(t=>{
    const li=document.createElement('li');
    li.className='ticket-line';
    li.innerHTML = `
      <div>
        <span><strong>${t.id}</strong> • Placa: ${t.plate} • Vaga: ${t.slot}</span>
        <span style="margin-left:12px">Entrada: ${dtDisp(t.start)}</span>
        ${t.note ? `<span style="margin-left:12px">Obs: ${t.note}</span>` : ''}
      </div>`;
    $activeList.appendChild(li);
  });
}

// Select de finalização
function renderFinishSelect(){
  if(!$finishTicket) return;
  $finishTicket.innerHTML='<option value="">Selecione...</option>';
  state.tickets.forEach(t=>{
    const opt=document.createElement('option');
    opt.value=t.id;
    opt.textContent=`${t.id} - ${t.plate} (${t.slot})`;
    $finishTicket.appendChild(opt);
  });
}

// Cálculo
function computeCharge(t,end){
  const rateHour=parseFloat($rateHour.value||'0'),
        minFraction=parseInt($minFraction.value||'0',10),
        fraction=parseInt($fraction.value||'0',10),
        lostFee=parseFloat($lostFee.value||'0'),
        discount=parseFloat($discount.value||'0'),
        dailyMax=parseFloat($dailyMax.value||'0');
  const minutes=diffMinutes(t.start,end);
  const perMinute=rateHour/60;
  const baseMin=Math.max(minutes,minFraction);
  const chunks=ceilDiv(baseMin,fraction);
  const chargedMinutes=chunks*fraction;
  let subtotal=perMinute*chargedMinutes, extra=0;
  if($lostTicket.value==='yes') extra+=lostFee;
  let total=Math.max(0,subtotal-discount)+extra;
  total=Math.min(total,dailyMax>0?dailyMax:total);
  return {minutes,chargedMinutes,subtotal,discount,extra,total};
}

// Limpa áreas de pagamento
function clearPaymentUI(){
  if($pixArea) $pixArea.innerHTML='';
  if($cardArea) $cardArea.innerHTML='';
  if($cashArea) $cashArea.innerHTML='';
  if($confirmPayment){ $confirmPayment.disabled=true; $confirmPayment.onclick=null; }
  if($printReceipt){ $printReceipt.disabled=true; }
  state.currentPayment = null;
}

// Atualiza cálculo e telas de pagamento
function updateCalc(){
  if($calcArea){ $calcArea.innerHTML=''; }
  clearPaymentUI();

  const id=$finishTicket?.value; if(!id) return;
  const t=state.tickets.find(x=>x.id===id); if(!t) return;
  const end=$endTime?.value?new Date($endTime.value):new Date();
  const c=computeCharge(t,end);

  if($calcArea){
    $calcArea.innerHTML=`<div class="price-line"><span><strong>Placa:</strong> ${t.plate}</span>
      <span><strong>Vaga:</strong> ${t.slot}</span></div>
      <div class="price-line"><span>Entrada:</span><span>${dtDisp(t.start)}</span></div>
      <div class="price-line"><span>Saída:</span><span>${dtDisp(end)}</span></div>
      <div class="price-line"><span>Tempo total:</span><span>${c.minutes} min</span></div>
      <div class="price-line"><span>Minutos cobrados:</span><span>${c.chargedMinutes} min</span></div>
      <div class="price-line"><span>Subtotal:</span><span>${fmtBRL(c.subtotal)}</span></div>
      <div class="price-line"><span>Desconto:</span><span>${fmtBRL(c.discount)}</span></div>
      <div class="price-line"><span>Extras:</span><span>${fmtBRL(c.extra)}</span></div>
      <div class="price-line total"><span>Total a pagar:</span><span><strong>${fmtBRL(c.total)}</strong></span></div>`;
  }

  const current = {
    id: t.id,
    plate: t.plate,
    slot: t.slot,
    start: dtDisp(t.start),
    end: dtDisp(end),
    durationMin: c.minutes,
    chargedMinutes: c.chargedMinutes,
    subtotal: c.subtotal,
    discount: c.discount,
    extra: c.extra,
    total: Number(c.total.toFixed(2)),
    method: null,
    ts: new Date(),
    pixPayload: null
  };
  state.currentPayment = current;

  const method=$payMethod?.value || '';
  if(method==='pix') renderPIX(current);
  else if(method==='card') renderCardSmart(current);
  else if(method==='cash') renderCash(current);
}

[$finishTicket,$endTime,$payMethod,$lostTicket,$rateHour,$minFraction,$fraction,$lostFee,$discount,$dailyMax]
  .forEach(el=>el?.addEventListener('change',updateCalc));

// PIX
async function renderPIX(current) {
  if($pixArea) $pixArea.innerHTML = "<p>Gerando QR Code PIX...</p>";
  if($cardArea) $cardArea.innerHTML = "";
  if($cashArea) $cashArea.innerHTML = "";

  try {
    const resp = await fetch(`${API}/gerar-pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: current.id,
        plate: current.plate,
        slot: current.slot,
        total: current.total,
        durationMin: current.durationMin,
        chargedMin: current.chargedMinutes
      })
    });
    const data = await resp.json();
    if(!resp.ok) throw new Error(data?.error || 'Erro ao gerar PIX');

    if($pixArea){
      $pixArea.innerHTML = `
        <h3>Pagamento via PIX</h3>
        <img src="${data.qrUrl}" alt="QR Code PIX" style="width:250px;height:250px;"/>
        <p><strong>Copia e cola:</strong></p>
        <textarea readonly style="width:100%;height:80px">${data.qrText}</textarea>
        <small>Payment ID: ${data.paymentId}</small>
        <p>Após aprovação, clique em Confirmar pagamento para finalizar.</p>
      `;
    }

    $confirmPayment.disabled = false;
    $confirmPayment.onclick = () => finalizeTicketAndHistory('PIX');

    state.currentPayment.method = 'PIX';
    state.currentPayment.paymentId = data.paymentId;
    state.currentPayment.pixPayload = data.pixPayload;
  } catch (err) {
    if($pixArea) $pixArea.innerHTML = "<p style='color:red'>Erro ao gerar QR Code PIX.</p>";
    showMessage('Erro ao gerar PIX: ' + err.message,'error');
  }
}

// Cartão na Smart
function renderCardSmart(current){
  if($cardArea){
    $cardArea.innerHTML = `
      <h3>Cartão na Smart</h3>
      <p>Cobre ${fmtBRL(current.total)} na maquininha Mercado Pago Smart.</p>
      <p>Depois de aprovado, clique em "Confirmar pagamento".</p>
    `;
  }
  if($pixArea) $pixArea.innerHTML = "";
  if($cashArea) $cashArea.innerHTML = "";

  $confirmPayment.disabled = false;
  $confirmPayment.onclick = () => finalizeTicketAndHistory('CARTÃO (SMART)');
  state.currentPayment.method = 'CARTÃO (SMART)';
}

// Dinheiro
function renderCash(current){
  if($cashArea){
    $cashArea.innerHTML = `
      <h3>Pagamento em dinheiro</h3>
      <p>Receber ${fmtBRL(current.total)} em espécie e confirmar abaixo.</p>
    `;
  }
  if($pixArea) $pixArea.innerHTML = "";
  if($cardArea) $cardArea.innerHTML = "";

  $confirmPayment.disabled = false;
  $confirmPayment.onclick = () => finalizeTicketAndHistory('DINHEIRO');
  state.currentPayment.method = 'DINHEIRO';
}

// Finalização do ticket
function finalizeTicketAndHistory(method){
  const id=$finishTicket?.value; if(!id) return;
  const idx=state.tickets.findIndex(x=>x.id===id); if(idx<0) return;

  const t=state.tickets[idx];
  const end=$endTime?.value?new Date($endTime.value):new Date();
  const c=computeCharge(t,end);

  state.tickets.splice(idx,1);
  renderActive(); 
  renderFinishSelect();

  const entry = {
    id: t.id,
    plate: t.plate,
    slot: t.slot,
    start: t.start,
    end,
    chargedMinutes: c.chargedMinutes,
    subtotal: c.subtotal,
    discount: c.discount,
    extra: c.extra,
    total: Number(c.total.toFixed(2)),
    method,
    ts: new Date(),
    pixPayload: state.currentPayment?.pixPayload || null
  };
  state.history.unshift(entry);
  renderHistory();

  clearPaymentUI();

  state.lastReceipt = {
    id: entry.id,
    plate: entry.plate,
    slot: entry.slot,
    start: dtDisp(entry.start),
    end: dtDisp(entry.end),
    chargedMinutes: entry.chargedMinutes,
    subtotal: entry.subtotal,
    discount: entry.discount,
    extra: entry.extra,
    total: entry.total,
    method: entry.method,
    ts: entry.ts,
    pixPayload: entry.pixPayload
  };

  showMessage(`Ticket ${t.id} finalizado com pagamento: ${method}.`,'success');

  // Imprime automaticamente após pagamento
  imprimirTicket(state.lastReceipt);
}

// Histórico
function renderHistory(){
  if(!$historyTableBody) return;
  $historyTableBody.innerHTML='';
  if(state.history.length===0){
    const tr=document.createElement('tr');
    tr.innerHTML = `<td colspan="8" style="text-align:center">Sem movimentos.</td>`;
    $historyTableBody.appendChild(tr);
    return;
  }
  state.history.forEach(h=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${h.id}</td>
      <td>${h.plate}</td>
      <td>${dtDisp(h.start)}</td>
      <td>${dtDisp(h.end)}</td>
      <td>${fmtBRL(h.total)}</td>
      <td>${h.method}</td>
      <td>Pago</td>
      <td>
        <button class="btn" data-action="print" data-id="${h.id}">Recibo</button>
        <button class="btn danger" data-action="remove" data-id="${h.id}">Remover</button>
      </td>`;
    $historyTableBody.appendChild(tr);
  });

  $historyTableBody.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-id');
      const action = e.currentTarget.getAttribute('data-action');
      const entry = state.history.find(x=>x.id===id);
      if(!entry) return;

      if(action==='print'){
        state.lastReceipt = {
          id: entry.id,
          plate: entry.plate,
          slot: entry.slot,
          start: dtDisp(entry.start),
          end: dtDisp(entry.end),
          chargedMinutes: entry.chargedMinutes,
          subtotal: entry.subtotal,
          discount: entry.discount,
          extra: entry.extra,
          total: entry.total,
          method: entry.method,
          ts: entry.ts,
          pixPayload: entry.pixPayload
        };
        imprimirTicket(state.lastReceipt);
      } else if(action==='remove'){
        state.history = state.history.filter(x=>x.id!==id);
        renderHistory();
        showMessage(`Movimento ${id} removido do histórico.`,'info');
      }
    });
  });
}

// ======== IMPRESSÃO VIA RAWBT (ESC/POS) ========

async function imprimirTicket(ticket) {
  if (!ticket) {
    showMessage("Nenhum recibo disponível para impressão.", "error");
    return;
  }

  try {
    const res = await fetch(`${API}/gerar-ticket-escpos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket)
    });

    if (!res.ok) {
      showMessage("Erro ao gerar ESC/POS no servidor.", "error");
      return;
    }

    const escpos = await res.text();
    const base64 = btoa(escpos);

    window.location.href = "rawbt:base64," + base64;
    showMessage(`Ticket ${ticket.id} enviado para impressão (RawBT).`,"success");
  } catch (err) {
    showMessage("Falha ao imprimir: " + err.message,"error");
  }
}

// Botão de imprimir comprovante
if($printReceipt){
  $printReceipt.addEventListener('click', () => {
    imprimirTicket(state.lastReceipt);
  });
}

// Cancelar pagamento
function cancelPayment(){
  clearPaymentUI();
  showMessage('Operação de pagamento cancelada.','info');
}
$cancelPayment?.addEventListener('click', cancelPayment);

// Inicialização
function initDefaults(){
  if($rateHour) $rateHour.value = $rateHour.value || '12.00';
  if($minFraction) $minFraction.value = $minFraction.value || '15';
  if($fraction) $fraction.value = $fraction.value || '15';
  if($lostFee) $lostFee.value = $lostFee.value || '30.00';
  if($discount) $discount.value = $discount.value || '0.00';
  if($dailyMax) $dailyMax.value = $dailyMax.value || '60.00';
  if($payMethod) $payMethod.value = $payMethod.value || 'pix';
  renderActive();
  renderFinishSelect();
  renderHistory();
  showMessage('Sistema pronto para uso.','info');
}
document.addEventListener('DOMContentLoaded', initDefaults);
