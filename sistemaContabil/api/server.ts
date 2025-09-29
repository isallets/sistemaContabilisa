import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { db } from "../firebase";

const app = express();

app.use(cors());
app.use(express.json());

// Servir frontend
const publicPath = path.join(__dirname, "../");
app.use(express.static(publicPath));

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
  res.sendFile(path.join(process.cwd(), "style.css"));
  res.sendFile(path.join(process.cwd(), "script.js"));
});

// --- Tipos ---
interface Conta {
  id: number;
  codigo: string;
  nome_conta: string;
  grupo_contabil: "Ativo" | "Passivo" | "Patrimônio Líquido";
  subgrupo1: string;
  subgrupo2: string;
}

interface Lancamento {
  id: number;
  data: string;
  historico: string;
  valor: number;
  contaDebitoId: number;
  contaCreditoId: number;
}

// --- Criar contas padrão ---
const criarContasPadrao = async () => {
  const snapshot = await db.ref("contas").once("value");
  if (!snapshot.exists()) {
    const contasPadrao: Conta[] = [
      { id: 1, codigo: "1.1.01.001", nome_conta: "Caixa Geral", grupo_contabil: "Ativo", subgrupo1: "Ativo Circulante", subgrupo2: "Disponibilidades" },
      { id: 2, codigo: "2.1.01.001", nome_conta: "Fornecedores Nacionais", grupo_contabil: "Passivo", subgrupo1: "Passivo Circulante", subgrupo2: "Obrigações" },
      { id: 3, codigo: "3.1.01.001", nome_conta: "Capital Social", grupo_contabil: "Patrimônio Líquido", subgrupo1: "Capital", subgrupo2: "-" },
    ];
    for (const conta of contasPadrao) {
      const ref = db.ref("contas").push();
      await ref.set(conta);
    }
  }
};
criarContasPadrao();

// --- ROTAS CONTAS ---
app.get("/api/contas", async (req: Request, res: Response) => {
  const snapshot = await db.ref("contas").once("value");
  const contas: Conta[] = snapshot.val() ? Object.values(snapshot.val()) : [];
  return res.status(200).json(contas);
});

app.post("/api/contas", async (req: Request, res: Response) => {
  const { codigo, nome_conta, grupo_contabil, subgrupo1, subgrupo2 } = req.body;
  const ref = db.ref("contas").push();
  const novaConta: Conta = {
    id: Date.now(),
    codigo,
    nome_conta,
    grupo_contabil,
    subgrupo1,
    subgrupo2,
  };
  await ref.set(novaConta);
  return res.status(201).json(novaConta); // ✅ devolve a conta criada
});

// (demais rotas de lançamentos, balancete, balanço e razão iguais ao que você já tinha)

export default app;
