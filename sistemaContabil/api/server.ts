import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { db } from "../firebase";

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

// Servir frontend
const publicPath = path.join(__dirname, "../");
app.use(express.static(publicPath));

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
  res.sendFile(path.join(process.cwd(), "style.css"));
  res.sendFile(path.join(process.cwd(), "script.js"));
  res.sendFile(path.join(process.cwd(), "login.html"));
  res.sendFile(path.join(process.cwd(), "login.js"));
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

const groupBy = (array: any[], key: string) => {
  return array.reduce((result, currentValue) => {
    const groupKey = currentValue[key] || 'Sem Subgrupo';
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(currentValue);
    return result;
  }, {});
};

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

// --- ROTAS PARA LANÇAMENTOS --- 
app.get("/api/lancamentos", async (req: Request, res: Response) => { 
  const contasSnap = await db.ref("contas").once("value"); 
  const lancSnap = await db.ref("lancamentos").once("value"); 
  const contas: Conta[] = contasSnap.val() ? 
   Object.values(contasSnap.val()) : []; 
  const lancamentos: Lancamento[] = lancSnap.val() ? 
  Object.values(lancSnap.val()) : []; 
  
  const lancamentosComNomes = lancamentos.map((lanc) => { 
    const contaDebito = contas.find((c) => c.id === lanc.contaDebitoId); 
    const contaCredito = contas.find((c) => c.id === lanc.contaCreditoId); 
    return { 
      ...lanc, 
      nomeContaDebito: contaDebito?.nome_conta, 
      nomeContaCredito: contaCredito?.nome_conta, }; 
    }); 
    return res.status(200).json(lancamentosComNomes); }); app.post("/api/lancamentos", async (req: Request, res: Response) => { const { historico, valor, contaDebitoId, contaCreditoId } = req.body; const ref = db.ref("lancamentos").push(); const novoLancamento: Lancamento = { id: Date.now(), data: new Date().toLocaleDateString("pt-BR"), historico, valor: parseFloat(valor), contaDebitoId: parseInt(contaDebitoId), contaCreditoId: parseInt(contaCreditoId), }; await ref.set(novoLancamento); return res.status(201).json(novoLancamento); }); 
    
    // --- ROTAS BALANCETE, BALANÇO PATRIMONIAL E LIVRO RAZÃO 
    app.get("/api/balancete", async (req: Request, res: Response) => { const contasSnap = await db.ref("contas").once("value"); const lancSnap = await db.ref("lancamentos").once("value"); const contas: Conta[] = contasSnap.val() ? Object.values(contasSnap.val()) : []; const lancamentos: Lancamento[] = lancSnap.val() ? Object.values(lancSnap.val()) : []; const balancete = contas.map((conta) => { const totalDebito = lancamentos.filter(l => l.contaDebitoId === conta.id).reduce((s, l) => s + l.valor, 0); const totalCredito = lancamentos.filter(l => l.contaCreditoId === conta.id).reduce((s, l) => s + l.valor, 0); return { codigo: conta.codigo, nome_conta: conta.nome_conta, totalDebito, totalCredito, saldoFinal: totalDebito - totalCredito, }; }); const balanceteFiltrado = balancete.filter(item => item.totalDebito > 0 || item.totalCredito > 0); return res.status(200).json(balanceteFiltrado); });
   
    // Balanço Patrimonial 
    // Balanço Patrimonial (VERSÃO FINAL E CORRETA)
app.get("/api/balanco-patrimonial", async (req: Request, res: Response) => {
  try {
      const contasSnap = await db.ref("contas").once("value");
      const lancSnap = await db.ref("lancamentos").once("value");

      // Helper para transformar a resposta do Firebase (objeto) em um array com IDs
      const firebaseObjectToArray = (snapshotVal: object) => {
          if (!snapshotVal) return [];
          return Object.entries(snapshotVal).map(([id, data]) => ({ id, ...data }));
      };
      
      const contas = firebaseObjectToArray(contasSnap.val());
      const lancamentos = firebaseObjectToArray(lancSnap.val());

      const saldos = contas.map((conta: any) => {
          const totalDebito = lancamentos.filter((l: any) => l.contaDebitoId === conta.id).reduce((s, l: any) => s + l.valor, 0);
          const totalCredito = lancamentos.filter((l: any) => l.contaCreditoId === conta.id).reduce((s, l: any) => s + l.valor, 0);
          return { ...conta, saldo: totalDebito - totalCredito };
      }).filter((c: any) => c.saldo !== 0);

      // A função groupBy que já corrigimos
      const groupBy = (array: any[], key: string) => {
          return array.reduce((result, currentValue) => {
              const groupKey = currentValue[key] || 'Sem Subgrupo';
              if (!result[groupKey]) { result[groupKey] = []; }
              result[groupKey].push(currentValue);
              return result;
          }, {});
      };

      // --- LÓGICA DE AGRUPAMENTO CORRIGIDA E CONSISTENTE ---
      const relatorioFinal = {
          ativo: {},
          passivo: {},
          patrimonioLiquido: {}
      };

      const ativoPorSubgrupo1 = groupBy(saldos.filter((c: any) => c.grupo_contabil === 'Ativo'), 'subgrupo1');
      for (const subgrupo1 in ativoPorSubgrupo1) { (relatorioFinal.ativo as any)[subgrupo1] = groupBy(ativoPorSubgrupo1[subgrupo1], 'subgrupo2'); }

      const passivoPorSubgrupo1 = groupBy(saldos.filter((c: any) => c.grupo_contabil === 'Passivo'), 'subgrupo1');
      for (const subgrupo1 in passivoPorSubgrupo1) { (relatorioFinal.passivo as any)[subgrupo1] = groupBy(passivoPorSubgrupo1[subgrupo1], 'subgrupo2'); }

      const plPorSubgrupo1 = groupBy(saldos.filter((c: any) => c.grupo_contabil === 'Patrimônio Líquido'), 'subgrupo1');
      for (const subgrupo1 in plPorSubgrupo1) { (relatorioFinal.patrimonioLiquido as any)[subgrupo1] = groupBy(plPorSubgrupo1[subgrupo1], 'subgrupo2'); }

      return res.status(200).json(relatorioFinal);

  } catch (error) {
      console.error("Erro ao gerar balanço:", error);
      return res.status(500).json({ message: "Erro interno no servidor ao gerar balanço." });
  }
});
    
    // Livro Razão 
    app.get("/api/livro-razao/:contaId", async (req: Request, res: Response) => { const contaId = parseInt(req.params.contaId, 10); const contasSnap = await db.ref("contas").once("value"); const lancSnap = await db.ref("lancamentos").once("value"); const contas: Conta[] = contasSnap.val() ? Object.values(contasSnap.val()) : []; const lancamentos: Lancamento[] = lancSnap.val() ? Object.values(lancSnap.val()) : []; const contaSelecionada = contas.find(c => c.id === contaId); if (!contaSelecionada) return res.status(404).json({ message: "Conta não encontrada" }); const movimentos = lancamentos .filter(l => l.contaDebitoId === contaId || l.contaCreditoId === contaId) .map(l => ({ data: l.data, historico: l.historico, debito: l.contaDebitoId === contaId ? l.valor : 0, credito: l.contaCreditoId === contaId ? l.valor : 0, })); const totalDebito = movimentos.reduce((s, m) => s + m.debito, 0); const totalCredito = movimentos.reduce((s, m) => s + m.credito, 0); const saldoFinal = totalDebito - totalCredito; return res.status(200).json({ conta: contaSelecionada, movimentos, totalDebito, totalCredito, saldoFinal, }); }); 
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    });

    export default app;