import express from "express";
import { pool } from "../server.js";
import PDFDocument from "pdfkit";
import "pdfkit-table";

const router = express.Router();

// ================= LISTAR TICKETS ATIVOS =================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tickets WHERE status = 'Ativo' ORDER BY entrada ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar tickets:", err);
    res.status(500).json({ error: "Erro ao listar tickets" });
  }
});

// ================= LISTAR HISTÓRICO =================
router.get("/history", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nome, telefone, marca_modelo, placa, vaga,
             entrada, saida, subtotal, desconto, taxa_extra, total,
             pagamento, status, observacoes
      FROM tickets
      WHERE status != 'Ativo'
      ORDER BY entrada DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar histórico:", err);
    res.status(500).json({ error: "Erro ao listar histórico" });
  }
});

// ================= CRIAR TICKET =================
router.post("/", async (req, res) => {
  try {
    const { nome, telefone, placa, vaga, entrada, valor_diario, observacoes, marca_modelo } = req.body;

    if (!nome || !telefone || !placa || !marca_modelo || !valor_diario) {
      return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
    }

    const result = await pool.query(
      `INSERT INTO tickets (nome, telefone, placa, vaga, entrada, valor_diario, observacoes, marca_modelo, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Ativo') RETURNING *`,
      [nome, telefone, placa, vaga || null, entrada, valor_diario, observacoes || null, marca_modelo]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar ticket:", err);
    res.status(500).json({ error: "Erro ao criar ticket" });
  }
});

// ================= FINALIZAR TICKET =================
router.put("/:id/finalizar", async (req, res) => {
  const { id } = req.params;
  const { saida, subtotal, desconto, taxa_extra, total, pagamento, observacoes, marca_modelo } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tickets 
       SET saida=$1,
           subtotal=$2,
           desconto=$3,
           taxa_extra=$4,
           total=$5,
           pagamento=$6,
           observacoes=COALESCE($7, observacoes),
           marca_modelo=COALESCE($8, marca_modelo),
           status='Finalizado'
       WHERE id=$9 RETURNING *`,
      [saida, subtotal, desconto, taxa_extra, total, pagamento, observacoes ?? null, marca_modelo ?? null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao finalizar ticket:", err);
    res.status(500).json({ error: "Erro ao finalizar ticket" });
  }
});

// ================= LIMPAR HISTÓRICO =================
router.delete("/history", async (req, res) => {
  try {
    await pool.query("DELETE FROM tickets WHERE status != 'Ativo'");
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao limpar histórico:", err);
    res.status(500).json({ error: "Erro ao limpar histórico" });
  }
});

// ================= PDF RELATÓRIO =================
router.get("/pdf", async (req, res) => {
  const { inicio, fim } = req.query;
  try {
    // ✅ Corrige o intervalo para incluir todo o dia
    const inicioFormatado = new Date(`${inicio}T00:00:00`);
    const fimFormatado = new Date(`${fim}T23:59:59`);

    const result = await pool.query(
      "SELECT * FROM tickets WHERE entrada BETWEEN $1 AND $2 ORDER BY entrada ASC",
      [inicioFormatado, fimFormatado]
    );

    const doc = new PDFDocument({ margin: 20, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // ✅ Corrige a data exibida no PDF
    const dataRelatorio = `Dia: ${inicio
      ? new Date(`${inicio}T00:00:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : "--"}`;

    const titulo = "Relatório de Tickets";
    doc.fontSize(16).text(titulo, 20, 30, { align: "left" });
    doc.fontSize(16).text(dataRelatorio, 0, 30, { align: "right" });
    doc.moveDown(2);

    const colunas = [
      { label: "#", width: 30 },
      { label: "Nome", width: 120 },
      { label: "Telefone", width: 100 },
      { label: "Modelo", width: 100 },
      { label: "Placa", width: 70 },
      { label: "Vaga", width: 60 },
      { label: "Entrada", width: 80 },
      { label: "Total", width: 70 }
    ];

    const startX = 20;
    let y = doc.y;
    const rowHeight = 20;

    doc.font("Helvetica-Bold").fontSize(10);
    let x = startX;
    colunas.forEach(col => {
      doc.text(col.label, x, y + 5, { width: col.width, align: "center" });
      x += col.width;
    });

    y += rowHeight;
    doc.moveTo(startX, y).lineTo(x, y).stroke();

    x = startX;
    colunas.forEach(col => {
      doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
      x += col.width;
    });
    doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();

    doc.font("Helvetica").fontSize(9);
    const ticketsByDay = { "Todos": result.rows };

    let totalTickets = 0;
    let somaValores = 0;

    for (const dia of Object.keys(ticketsByDay)) {
      ticketsByDay[dia].forEach((t, idx) => {
        let x = startX;
        colunas.forEach(col => {
          let valor = "--";
          if (col.label === "#") valor = idx + 1;
          if (col.label === "Nome") valor = t.nome || "--";
          if (col.label === "Telefone") valor = t.telefone || "--";
          if (col.label === "Modelo") valor = t.marca_modelo || "--";
          if (col.label === "Placa") valor = t.placa || "--";
          if (col.label === "Vaga") valor = t.vaga || "--";
          if (col.label === "Entrada") valor = t.entrada
            ? new Date(t.entrada).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })
            : "--";
          if (col.label === "Total") {
            valor = t.total != null ? `R$ ${Number(t.total).toFixed(2)}` : "--";
            if (t.total != null) somaValores += Number(t.total);
          }

          doc.text(valor, x, y + 5, { width: col.width, align: "center" });
          x += col.width;
        });

        y += rowHeight;
        doc.moveTo(startX, y).lineTo(x, y).stroke();

        x = startX;
        colunas.forEach(col => {
          doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
          x += col.width;
        });
        doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();

        totalTickets++;
      });
    }

    y += 30;
    doc.moveTo(startX, y - 10).lineTo(x, y - 10).stroke();
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text(`Total de Tickets: ${totalTickets}`, startX, y, { align: "center" });
    doc.text(`Soma dos Valores: R$ ${somaValores.toFixed(2)}`, 300, y, { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    res.status(500).json({ error: "Erro ao gerar PDF" });
  }
});


export default router;
