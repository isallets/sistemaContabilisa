import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { db } from "../firebase";

const app = express();

app.use(cors());
app.use(express.json());

// Servir frontend (index.html, style.css, script.js)
const publicPath = path.join(__dirname, "../");
app.use(express.static(publicPath));

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
  res.sendFile(path.join(process.cwd(), 'style.css'));
  res.sendFile(path.join(process.cwd(), 'script.js'));
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

// --- ROTAS PARA CONTAS ---
app.get("/api/contas", async (req: Request, res: Response) => {
  const snapshot = await db.ref("contas").once("value");
  const contas = snapshot.val() ? Object.values(snapshot.val()) : [];
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
  return res.status(201).json(novaConta);
});

// --- ROTAS PARA LANÇAMENTOS ---
app.get("/api/lancamentos", async (req: Request, res: Response) => {
  const contasSnap = await db.ref("contas").once("value");
  const lancSnap = await db.ref("lancamentos").once("value");

  const contas: Conta[] = contasSnap.val() ? Object.values(contasSnap.val()) : [];
  const lancamentos: Lancamento[] = lancSnap.val() ? Object.values(lancSnap.val()) : [];

  const lancamentosComNomes = lancamentos.map((lanc) => {
    const contaDebito = contas.find((c) => c.id === lanc.contaDebitoId);
    const contaCredito = contas.find((c) => c.id === lanc.contaCreditoId);
    return {
      ...lanc,
      nomeContaDebito: contaDebito?.nome_conta,
      nomeContaCredito: contaCredito?.nome_conta,
    };
  });

  return res.status(200).json(lancamentosComNomes);
});

app.post("/api/lancamentos", async (req: Request, res: Response) => {
  const { historico, valor, contaDebitoId, contaCreditoId } = req.body;
  const ref = db.ref("lancamentos").push();
  const novoLancamento: Lancamento = {
    id: Date.now(),
    data: new Date().toLocaleDateString("pt-BR"),
    historico,
    valor: parseFloat(valor),
    contaDebitoId: parseInt(contaDebitoId),
    contaCreditoId: parseInt(contaCreditoId),
  };
  await ref.set(novoLancamento);
  return res.status(201).json(novoLancamento);
});

// --- ROTA BALANCETE ---
app.get("/api/balancete", async (req: Request, res: Response) => {
  const contasSnap = await db.ref("contas").once("value");
  const lancSnap = await db.ref("lancamentos").once("value");

  const contas: Conta[] = contasSnap.val() ? Object.values(contasSnap.val()) : [];
  const lancamentos: Lancamento[] = lancSnap.val() ? Object.values(lancSnap.val()) : [];

  const balancete = contas.map((conta) => {
    const totalDebito = lancamentos
      .filter((lanc) => lanc.contaDebitoId === conta.id)
      .reduce((soma, lanc) => soma + lanc.valor, 0);

    const totalCredito = lancamentos
      .filter((lanc) => lanc.contaCreditoId === conta.id)
      .reduce((soma, lanc) => soma + lanc.valor, 0);

    return {
      codigo: conta.codigo,
      nome_conta: conta.nome_conta,
      totalDebito,
      totalCredito,
      saldoFinal: totalDebito - totalCredito,
    };
  });

  const balanceteFiltrado = balancete.filter(
    (item) => item.totalDebito > 0 || item.totalCredito > 0
  );

  return res.status(200).json(balanceteFiltrado);
});

// --- ROTA BALANÇO PATRIMONIAL ---
app.get("/api/balanco-patrimonial", async (req: Request, res: Response) => {
  const contasSnap = await db.ref("contas").once("value");
  const lancSnap = await db.ref("lancamentos").once("value");

  const contas: Conta[] = contasSnap.val() ? Object.values(contasSnap.val()) : [];
  const lancamentos: Lancamento[] = lancSnap.val() ? Object.values(lancSnap.val()) : [];

  const saldos = contas
    .map((conta) => {
      const totalDebito = lancamentos
        .filter((lanc) => lanc.contaDebitoId === conta.id)
        .reduce((soma, lanc) => soma + lanc.valor, 0);

      const totalCredito = lancamentos
        .filter((lanc) => lanc.contaCreditoId === conta.id)
        .reduce((soma, lanc) => soma + lanc.valor, 0);

      return {
        ...conta,
        saldo: totalDebito - totalCredito,
      };
    })
    .filter((conta) => conta.saldo !== 0);

  const relatorio = {
    ativo: {
      circulante: saldos.filter((c) => c.subgrupo1 === "Ativo Circulante"),
      naoCirculante: saldos.filter((c) => c.subgrupo1 === "Ativo Não Circulante"),
    },
    passivo: {
      circulante: saldos.filter((c) => c.subgrupo1 === "Passivo Circulante"),
      naoCirculante: saldos.filter((c) => c.subgrupo1 === "Passivo Não Circulante"),
    },
    patrimonioLiquido: saldos.filter((c) => c.grupo_contabil === "Patrimônio Líquido"),
  };

  return res.status(200).json(relatorio);
});

// --- ROTA LIVRO RAZÃO ---
app.get("/api/livro-razao/:contaId", async (req: Request, res: Response) => {
  const contaId = parseInt(req.params.contaId, 10);

  const contasSnap = await db.ref("contas").once("value");
  const lancSnap = await db.ref("lancamentos").once("value");

  const contas: Conta[] = contasSnap.val() ? Object.values(contasSnap.val()) : [];
  const lancamentos: Lancamento[] = lancSnap.val() ? Object.values(lancSnap.val()) : [];

  const contaSelecionada = contas.find((c) => c.id === contaId);

  if (!contaSelecionada) {
    return res.status(404).json({ message: "Conta não encontrada" });
  }

  const movimentos = lancamentos
    .filter((lanc) => lanc.contaDebitoId === contaId || lanc.contaCreditoId === contaId)
    .map((lanc) => ({
      data: lanc.data,
      historico: lanc.historico,
      debito: lanc.contaDebitoId === contaId ? lanc.valor : 0,
      credito: lanc.contaCreditoId === contaId ? lanc.valor : 0,
    }));

  const totalDebito = movimentos.reduce((soma, mov) => soma + mov.debito, 0);
  const totalCredito = movimentos.reduce((soma, mov) => soma + mov.credito, 0);
  const saldoFinal = totalDebito - totalCredito;

  const resultado = {
    conta: contaSelecionada,
    movimentos,
    totalDebito,
    totalCredito,
    saldoFinal,
  };

  return res.status(200).json(resultado);
});

export default app;