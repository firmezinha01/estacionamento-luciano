
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Conexão com o banco Neon
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // necessário para Neon
  }
});

// Garante que o timezone seja São Paulo
pool.query("SET TIME ZONE 'America/Sao_Paulo';").catch(err => {
  console.error("Erro ao definir timezone:", err);
});
