import express from "express";
import { pool } from "../server.js";   // ✅ usa o pool do server.js

const router = express.Router();

// ================= ROTAS DE TICKETS =================

// Criar novo ticket
router.post("/", async (req, res) => {
  try {
    const { nome, telefone, placa, vaga, entrada, valor_diario, observacoes } = req.body;
    const result = await pool.query(
      `INSERT INTO tickets (nome, telefone, placa, vaga, entrada, valor_diario, observacoes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Ativo') RETURNING *`,
      [nome, telefone, placa, vaga, entrada, valor_diario, observacoes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar ticket:", err);
    res.status(500).json({ error: "Erro ao criar ticket" });
  }
});

// Listar tickets ativos
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tickets WHERE status = 'Ativo' ORDER BY entrada ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar tickets:", err);
    res.status(500).json({ error: "Erro ao listar tickets" });
  }
});

// Finalizar ticket
router.put("/:id/finalizar", async (req, res) => {
  try {
    const { id } = req.params;
    const { saida, subtotal, desconto, taxa_extra, total, pagamento } = req.body;
    const result = await pool.query(
      `UPDATE tickets SET saida=$1, subtotal=$2, desconto=$3, taxa_extra=$4, total=$5, pagamento=$6, status='Pago'
       WHERE id=$7 RETURNING *`,
      [saida, subtotal, desconto, taxa_extra, total, pagamento, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao finalizar ticket:", err);
    res.status(500).json({ error: "Erro ao finalizar ticket" });
  }
});

// Histórico de tickets pagos
router.get("/history", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tickets WHERE status = 'Pago' ORDER BY saida DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao carregar histórico:", err);
    res.status(500).json({ error: "Erro ao carregar histórico" });
  }
});

// Limpar histórico
router.delete("/history", async (req, res) => {
  try {
    await pool.query("DELETE FROM tickets WHERE status = 'Pago'");
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao limpar histórico:", err);
    res.status(500).json({ ok: false, error: "Erro ao limpar histórico" });
  }
});

export default router;
