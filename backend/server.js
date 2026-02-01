import express from "express";
import cors from "cors";
import { Pool } from "pg";
import ticketsRouter from "./routes/tickets.js";
import dotenv from "dotenv";
import os from "os";
import escpos from "escpos";
import escposUSB from "escpos-usb";

escpos.USB = escposUSB; // habilita USB


dotenv.config();
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Força timezone São Paulo
process.env.TZ = "America/Sao_Paulo";

// Conexão com Neon
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Garante timezone na sessão do Postgres
pool.query("SET TIME ZONE 'America/Sao_Paulo';").catch(err => {
  console.error("Erro ao definir timezone:", err);
});

const app = express();
app.use(cors());
app.use(express.json());

// Rotas principais
app.use("/tickets", ticketsRouter);

// ================= ESC/POS HELPERS =================
function escposInit() { return "\x1B\x40"; }
function escposAlignCenter() { return "\x1B\x61\x01"; }
function escposAlignLeft() { return "\x1B\x61\x00"; }
function escposBoldOn() { return "\x1B\x45\x01"; }
function escposBoldOff() { return "\x1B\x45\x00"; }
function escposDoubleSizeOn() { return "\x1D\x21\x11"; }
function escposDoubleSizeOff() { return "\x1D\x21\x00"; }
function escposNewLines(n = 1) { return "\n".repeat(n); }
function escposCut() { return "\x1D\x56\x41\x10"; }

// QR Code ESC/POS
function escposQrCode(data) {
  const storeLen = data.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;
  const bytes = [];

  bytes.push(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04);
  bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);
  bytes.push(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
  for (let i = 0; i < data.length; i++) {
    bytes.push(data.charCodeAt(i));
  }
  bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

  return Buffer.from(bytes).toString("binary");
}

// ================= GERADOR ESC/POS DO TICKET =================
async function gerarEscPosTicket(ticket) {
  let escpos = "";
  escpos += escposInit();

  // Cabeçalho com nome em destaque

  escpos += escposAlignCenter();
  escpos += escposDoubleSizeOn(); // só largura dupla
  escpos += "LS ESTACIONAMENTO\n";
  escpos += escposDoubleSizeOff();
  escpos += escposNewLines(1);

  escpos += escposAlignCenter();
  escpos += escposBoldOn();
  escpos += "COMPROVANTE DE ESTACIONAMENTO\n";
  escpos += escposBoldOff();
  escpos += "------------------------------\n";

  escpos += escposAlignCenter();
  // escpos += escposAlignLeft();
  escpos += `Ticket: ${ticket.id}\n`;
  escpos += `Nome: ${ticket.nome || "--"}\n`;
  escpos += `Telefone: ${ticket.telefone || "--"}\n`;
  escpos += `Marca/Modelo: ${ticket.marca_modelo || "--"}\n`;
  escpos += `Placa: ${ticket.placa}\n`;
  escpos += `Vaga: ${ticket.vaga}\n`;
  escpos += `Obs: ${ticket.observacoes || "--"}\n`;

  const entradaFmt = ticket.entrada
    ? new Date(ticket.entrada).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "--";
  const saidaFmt = ticket.saida
    ? new Date(ticket.saida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "--";

  escpos += escposAlignCenter();
  escpos += `Entrada: ${entradaFmt}\n`;
  escpos += `Saída:   ${saidaFmt}\n`;
  escpos += "------------------------------\n";

  escpos += escposAlignCenter();
  escpos += `Subtotal: R$ ${Number(ticket.subtotal).toFixed(2)}\n`;
  escpos += `Desconto: R$ ${Number(ticket.desconto).toFixed(2)}\n`;
  escpos += `Extras:   R$ ${Number(ticket.taxa_extra).toFixed(2)}\n`;
  escpos += "------------------------------\n";
  escpos += escposBoldOn();
  escpos += `TOTAL:    R$ ${Number(ticket.total).toFixed(2)}\n`;
  escpos += escposBoldOff();
  escpos += `Pagamento: ${ticket.pagamento}\n`;
  escpos += `Status: ${ticket.status}\n`;
  escpos += "------------------------------\n";

  if (ticket.pagamento === "pix" && ticket.pixPayload) {
    escpos += escposAlignCenter();
    escpos += "PAGAMENTO VIA PIX\n";
    escpos += "Escaneie o QR Code abaixo:\n";
    escpos += escposNewLines(1);
    escpos += escposQrCode(ticket.pixPayload);
    escpos += escposNewLines(1);
  }

  escpos += escposAlignCenter();
  escpos += escposNewLines(1);
  escpos += "Obrigado pela preferência!\n";
  escpos += "Guarde este comprovante.\n";
  escpos += escposNewLines(3);
  escpos += escposCut();

  return escpos;
}

// ============IMPRESSÃO==========
app.post("/imprimir-ticket", (req, res) => {
  res.json({ ok: true, ticket: req.body });
});
// // ================= ENDPOINT IMPRESSÃO DIRETA =================
// app.post("/imprimir-ticket", async (req, res) => {
//   try {
//     const ticket = req.body;

//     const device = new escpos.USB();
//     const printer = new escpos.Printer(device);

//     device.open(() => {
//       // Cabeçalho
//       printer
//         .encode("utf8")
//         .align("ct")
//         .style("b")
//         .size(1, 1)
//         .text("LS Estacionamento")
//         .text("--------------------------");

//       // Dados principais
//       printer
//         .align("lt")
//         .style("normal")
//         .size(0, 0)
//         .text(`Data: ${ticket.data}`)
//         .text(`Cliente: ${ticket.nome}`)
//         .style("b")
//         .size(1, 1)
//         .text(`Placa: ${ticket.placa}`)
//         .style("b")
//         .size(1, 1)
//         .text(`Valor: R$ ${ticket.total.toFixed(2)}`)
//         .text("--------------------------");

//       // QR Code PIX (se aplicável)
//       if (ticket.pagamento === "pix" && ticket.pixPayload) {
//         printer
//           .align("ct")
//           .style("normal")
//           .size(0, 0)
//           .text("PAGAMENTO VIA PIX")
//           .text("Escaneie o QR Code abaixo:");

//         const qrBytes = Buffer.from(escposQrCode(ticket.pixPayload), "binary");
//         device.write(qrBytes);
//       }

//       // Rodapé
//       printer
//         .align("ct")
//         .style("normal")
//         .size(0, 0)
//         .text("Obrigado pela preferência!")
//         .text("Guarde este comprovante.")
//         .cut()
//         .close();
//     });

//     res.json({ ok: true });
//   } catch (err) {
//     console.error("Erro ao imprimir:", err);
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });


// ================= ENDPOINT ESC/POS =================
app.post("/gerar-ticket-escpos", async (req, res) => {
  try {
    const ticket = req.body;
    const escpos = await gerarEscPosTicket(ticket);
    res.setHeader("Content-Type", "text/plain; charset=binary");
    res.send(escpos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Erro ao gerar ESC/POS" });
  }
});

// ================= PIX =================
app.post("/gerar-pix", (req, res) => {
  const paymentId = "PIX-" + Date.now();
  const valor = req.body.total || "0.00";

  const chave = "chavepix123";
  const payload = `${chave}|valor=${valor}|pid=${paymentId}`;

  res.json({
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`,
    qrText: payload,
    paymentId,
    pixPayload: payload
  });
});

// ================= ROTA PADRÃO =================
app.get("/", (req, res) => {
  res.send("🚗 API Estacionamento rodando com sucesso!");
});

const PORT = process.env.PORT || 3000;

// Captura o IP local da máquina (para acessar pela rede)
const interfaces = os.networkInterfaces();
let localIP = "localhost";
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === "IPv4" && !iface.internal) {
      localIP = iface.address;
    }
  }
}

app.listen(PORT, () => {
  console.log("====================================");
  console.log("Servidor rodando em:");
  console.log(`➡ Local:   http://localhost:${PORT}`);
  console.log(`➡ Rede:    http://${localIP}:${PORT}`);
  console.log("====================================");
});
