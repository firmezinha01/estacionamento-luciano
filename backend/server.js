import express from "express";
import cors from "cors";
import { Pool } from "pg";
import ticketsRouter from "./routes/tickets.js";
import dotenv from "dotenv";
import os from "os";

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
function escposBoldOn() { return "\x1B\x45\x01"; }
function escposBoldOff() { return "\x1B\x45\x00"; }
function escposDoubleSizeOn() { return "\x1D\x21\x11"; }
function escposDoubleSizeOff() { return "\x1D\x21\x00"; }
function escposNewLines(n = 1) { return "\n".repeat(n); }
function escposCut() { return "\x1D\x56\x41\x10"; }

// ================= GERADOR ESC/POS DO TICKET =================
async function gerarEscPosTicket(ticket) {
  let escpos = "";
  escpos += escposInit();

  escpos += escposAlignCenter();
  escpos += escposDoubleSizeOn();
  escpos += "LS ESTACIONAMENTO\n";
  escpos += escposDoubleSizeOff();
  escpos += escposNewLines(1);

  escpos += escposAlignCenter();
  escpos += escposBoldOn();
  escpos += "COMPROVANTE DE ESTACIONAMENTO\n";
  escpos += escposBoldOff();
  escpos += "------------------------------\n";

  escpos += escposAlignCenter();
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

  escpos += escposAlignCenter();
  escpos += "Obrigado pela preferência!\n";
  escpos += "Guarde este comprovante.\n";
  escpos += escposNewLines(3);
  escpos += escposCut();

  return escpos;
}

// ================= FRONTEND PEDE O ESC/POS =================
app.post("/gerar-ticket-escpos", async (req, res) => {
  try {
    const ticket = req.body;
    const escpos = await gerarEscPosTicket(ticket);
    res.setHeader("Content-Type", "text/plain; charset=binary");
    res.send(escpos);
  } catch (err) {
    console.error("Erro ao gerar ESC/POS:", err);
    res.status(500).json({ ok: false, error: "Erro ao gerar ESC/POS" });
  }
});

// ================= ROTA PADRÃO =================
app.get("/", (req, res) => {
  res.send("🚗 API Estacionamento rodando com sucesso!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("====================================");
  console.log("Servidor rodando na nuvem (Render)");
  console.log("====================================");
});