// import express from "express";
// import cors from "cors";
// import { Pool } from "pg";
// import ticketsRouter from "./routes/tickets.js";
// import dotenv from "dotenv";
// import os from "os";

// dotenv.config();
// console.log("DATABASE_URL:", process.env.DATABASE_URL);

// // Força timezone São Paulo
// process.env.TZ = "America/Sao_Paulo";

// // Conexão com Neon
// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
// });

// // Garante timezone na sessão do Postgres
// pool.query("SET TIME ZONE 'America/Sao_Paulo';").catch(err => {
//   console.error("Erro ao definir timezone:", err);
// });

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Rotas principais
// app.use("/tickets", ticketsRouter);

// // ================= ESC/POS HELPERS =================
// function escposInit() { return "\x1B\x40"; }
// function escposAlignCenter() { return "\x1B\x61\x01"; }
// function escposBoldOn() { return "\x1B\x45\x01"; }
// function escposBoldOff() { return "\x1B\x45\x00"; }
// function escposDoubleSizeOn() { return "\x1D\x21\x11"; }
// function escposDoubleSizeOff() { return "\x1D\x21\x00"; }
// function escposNewLines(n = 1) { return "\n".repeat(n); }
// function escposCut() { return "\x1D\x56\x41\x10"; }

// // ================= GERADOR ESC/POS DO TICKET =================
// async function gerarEscPosTicket(ticket) {
//   let escpos = "";
//   escpos += escposInit();

//   escpos += escposAlignCenter();
//   escpos += escposDoubleSizeOn();
//   escpos += "LS ESTACIONAMENTO\n";
//   escpos += escposDoubleSizeOff();
//   escpos += escposNewLines(1);

//   escpos += escposAlignCenter();
//   escpos += escposBoldOn();
//   escpos += "COMPROVANTE DE ESTACIONAMENTO\n";
//   escpos += escposBoldOff();
//   escpos += "------------------------------\n";

//   escpos += escposAlignCenter();
//   escpos += `Ticket: ${ticket.id}\n`;
//   escpos += `Nome: ${ticket.nome || "--"}\n`;
//   escpos += `Telefone: ${ticket.telefone || "--"}\n`;
//   escpos += `Marca/Modelo: ${ticket.marca_modelo || "--"}\n`;
//   escpos += `Placa: ${ticket.placa}\n`;
//   escpos += `Vaga: ${ticket.vaga}\n`;
//   escpos += `Obs: ${ticket.observacoes || "--"}\n`;

//   const entradaFmt = ticket.entrada
//     ? new Date(ticket.entrada).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
//     : "--";

//   const saidaFmt = ticket.saida
//     ? new Date(ticket.saida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
//     : "--";

//   escpos += escposAlignCenter();
//   escpos += `Entrada: ${entradaFmt}\n`;
//   escpos += `Saída:   ${saidaFmt}\n`;
//   escpos += "------------------------------\n";

//   escpos += escposAlignCenter();
//   escpos += `Subtotal: R$ ${Number(ticket.subtotal).toFixed(2)}\n`;
//   escpos += `Desconto: R$ ${Number(ticket.desconto).toFixed(2)}\n`;
//   escpos += `Extras:   R$ ${Number(ticket.taxa_extra).toFixed(2)}\n`;
//   escpos += "------------------------------\n";

//   escpos += escposBoldOn();
//   escpos += `TOTAL:    R$ ${Number(ticket.total).toFixed(2)}\n`;
//   escpos += escposBoldOff();
//   escpos += `Pagamento: ${ticket.pagamento}\n`;
//   escpos += `Status: ${ticket.status}\n`;
//   escpos += "------------------------------\n";

//   escpos += escposAlignCenter();
//   escpos += "Obrigado pela preferência!\n";
//   escpos += "Guarde este comprovante.\n";
//   escpos += escposNewLines(3);
//   escpos += escposCut();

//   return escpos;
// }

// // ================= FRONTEND PEDE O ESC/POS =================
// app.post("/gerar-ticket-escpos", async (req, res) => {
//   try {
//     const ticket = req.body;
//     const escpos = await gerarEscPosTicket(ticket);
//     res.setHeader("Content-Type", "text/plain; charset=binary");
//     res.send(escpos);
//   } catch (err) {
//     console.error("Erro ao gerar ESC/POS:", err);
//     res.status(500).json({ ok: false, error: "Erro ao gerar ESC/POS" });
//   }
// });

// // ================= ROTA PADRÃO =================
// app.get("/", (req, res) => {
//   res.send("🚗 API Estacionamento rodando com sucesso!");
// });

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log("====================================");
//   console.log("Servidor rodando na nuvem (Render)");
//   console.log("====================================");
// });

import express from "express";
import cors from "cors";
import { Pool } from "pg";
import ticketsRouter from "./routes/tickets.js";
import dotenv from "dotenv";

dotenv.config();
process.env.TZ = "America/Sao_Paulo";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SET TIME ZONE 'America/Sao_Paulo';").catch(err => {
  console.error("Erro ao definir timezone:", err);
});

const app = express();
app.use(cors());
app.use(express.json());

// Rotas principais
app.use("/tickets", ticketsRouter);

// ================= ESC/POS HELPERS (BYTES) =================
function b(...bytes) {
  return Buffer.from(bytes);
}

function t(text) {
  return Buffer.from(text, "latin1"); // encoding ideal para PT-BR
}

// ================= GERADOR ESC/POS DO TICKET =================
async function gerarEscPosTicket(ticket) {
  const cmds = [];

  cmds.push(b(0x1B, 0x40)); // init

  cmds.push(b(0x1B, 0x61, 0x01)); // center
  cmds.push(b(0x1D, 0x21, 0x11)); // double size
  cmds.push(t("LS ESTACIONAMENTO\n"));
  cmds.push(b(0x1D, 0x21, 0x00)); // normal
  cmds.push(t("\n"));

  cmds.push(b(0x1B, 0x61, 0x01)); // center
  cmds.push(b(0x1B, 0x45, 0x01)); // bold
  cmds.push(t("COMPROVANTE DE ESTACIONAMENTO\n"));
  cmds.push(b(0x1B, 0x45, 0x00)); // bold off
  cmds.push(t("------------------------------\n"));

  cmds.push(t(`Ticket: ${ticket.id}\n`));
  cmds.push(t(`Nome: ${ticket.nome || "--"}\n`));
  cmds.push(t(`Telefone: ${ticket.telefone || "--"}\n`));
  cmds.push(t(`Marca/Modelo: ${ticket.marca_modelo || "--"}\n`));
  cmds.push(t(`Placa: ${ticket.placa}\n`));
  cmds.push(t(`Vaga: ${ticket.vaga}\n`));
  cmds.push(t(`Obs: ${ticket.observacoes || "--"}\n`));

  const entradaFmt = ticket.entrada
    ? new Date(ticket.entrada).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "--";

  const saidaFmt = ticket.saida
    ? new Date(ticket.saida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "--";

  cmds.push(t(`Entrada: ${entradaFmt}\n`));
  cmds.push(t(`Saída:   ${saidaFmt}\n`));
  cmds.push(t("------------------------------\n"));

  cmds.push(t(`Subtotal: R$ ${Number(ticket.subtotal).toFixed(2)}\n`));
  cmds.push(t(`Desconto: R$ ${Number(ticket.desconto).toFixed(2)}\n`));
  cmds.push(t(`Extras:   R$ ${Number(ticket.taxa_extra).toFixed(2)}\n`));
  cmds.push(t("------------------------------\n"));

  cmds.push(b(0x1B, 0x45, 0x01)); // bold
  cmds.push(t(`TOTAL:    R$ ${Number(ticket.total).toFixed(2)}\n`));
  cmds.push(b(0x1B, 0x45, 0x00)); // bold off

  cmds.push(t(`Pagamento: ${ticket.pagamento}\n`));
  cmds.push(t(`Status: ${ticket.status}\n`));
  cmds.push(t("------------------------------\n"));

  cmds.push(t("Obrigado pela preferência!\n"));
  cmds.push(t("Guarde este comprovante.\n\n\n"));

  cmds.push(b(0x1D, 0x56, 0x41, 0x10)); // corte

  return Buffer.concat(cmds);
}

// ================= ROTA PARA O FRONT PEDIR ESC/POS =================
app.post("/gerar-ticket-escpos", async (req, res) => {
  try {
    const ticket = req.body;
    const buffer = await gerarEscPosTicket(ticket);

    res.setHeader("Content-Type", "text/plain");
    res.send(buffer.toString("base64")); // <-- AGORA VAI!
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
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
  console.log("====================================");
});