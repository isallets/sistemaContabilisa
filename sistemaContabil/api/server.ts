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

app.use(cors());
app.use(express.json());

// --- Tipos e Interfaces ---
interface Conta {
  id: number;
  codigo: string;
  nome_conta: string;
  grupo_contabil: 'Ativo' | 'Passivo' | 'Patrimônio Líquido';
  subgrupo1: string;
  subgrupo2: string;
}
interface Lancamento {
  id: number; data: string; historico: string; valor: number;
  contaDebitoId: number; contaCreditoId: number;
}
interface ContaComSaldo extends Conta {
    saldo: number;
}
interface RelatorioFinal {
  ativo: Record<string, Record<string, ContaComSaldo[]>>;
  passivo: Record<string, Record<string, ContaComSaldo[]>>;
  patrimonioLiquido: Record<string, Record<string, ContaComSaldo[]>>;
}

// --- Dados em Memória ---
let contas: Conta[] = [
  { id: 1, codigo: "1.1.01.001", nome_conta: "Caixa Geral", grupo_contabil: "Ativo", subgrupo1: "Ativo Circulante", subgrupo2: "Disponibilidades" },
  { id: 2, codigo: "2.1.01.001", nome_conta: "Fornecedores Nacionais", grupo_contabil: "Passivo", subgrupo1: "Passivo Circulante", subgrupo2: "Obrigações" },
  { id: 3, codigo: "3.1.01.001", nome_conta: "Capital Social", grupo_contabil: "Patrimônio Líquido", subgrupo1: "Capital", subgrupo2: "" },
  { id: 4, codigo: "1.2.01.001", nome_conta: "Contas a Receber a Longo Prazo", grupo_contabil: "Ativo", subgrupo1: "Ativo Não Circulante", subgrupo2: "Realizável a Longo Prazo" }
];
let proximoContaId = 5;
let lancamentos: Lancamento[] = [];
let proximoLancamentoId = 1;

const groupBy = (array: ContaComSaldo[], key: keyof ContaComSaldo) => {
    const initialValue: Record<string, ContaComSaldo[]> = {};
    return array.reduce((result, currentValue) => {
      const groupKey = String(currentValue[key]);
      (result[groupKey] = result[groupKey] || []).push(currentValue);
      return result;
    }, initialValue);
};

// --- ROTAS DA API ---
app.get('/api/contas', (req, res) => res.json(contas));

app.post('/api/contas', (req, res) => {
    const novaConta: Conta = { id: proximoContaId++, ...req.body };
    contas.push(novaConta);
    res.status(201).json(novaConta);
});

app.get('/api/lancamentos', (req, res) => {
    const lancamentosComNomes = lancamentos.map(lanc => ({...lanc, nomeContaDebito: contas.find(c=>c.id===lanc.contaDebitoId)?.nome_conta, nomeContaCredito: contas.find(c=>c.id===lanc.contaCreditoId)?.nome_conta}));
    res.json(lancamentosComNomes);
});

app.post('/api/lancamentos', (req, res) => {
    const { historico, valor, contaDebitoId, contaCreditoId } = req.body;
    const novoLancamento: Lancamento = { id: proximoLancamentoId++, data: new Date().toLocaleDateString('pt-BR'), historico, valor: parseFloat(valor), contaDebitoId: parseInt(contaDebitoId), contaCreditoId: parseInt(contaCreditoId) };
    lancamentos.push(novoLancamento);
    res.status(201).json(novoLancamento);
});

app.get('/api/balanco-patrimonial', (req: Request, res: Response) => {
    const saldos: ContaComSaldo[] = contas.map(conta => {
        const totalDebito = lancamentos.filter(l => l.contaDebitoId === conta.id).reduce((s, l) => s + l.valor, 0);
        const totalCredito = lancamentos.filter(l => l.contaCreditoId === conta.id).reduce((s, l) => s + l.valor, 0);
        return { ...conta, saldo: totalDebito - totalCredito };
    }).filter(conta => conta.saldo !== 0);

    const relatorioFinal: RelatorioFinal = { ativo: {}, passivo: {}, patrimonioLiquido: {} };
    const ativoPorSubgrupo1 = groupBy(saldos.filter(c => c.grupo_contabil === 'Ativo'), 'subgrupo1');
    for (const subgrupo1 in ativoPorSubgrupo1) { relatorioFinal.ativo[subgrupo1] = groupBy(ativoPorSubgrupo1[subgrupo1], 'subgrupo2'); }
    const passivoPorSubgrupo1 = groupBy(saldos.filter(c => c.grupo_contabil === 'Passivo'), 'subgrupo1');
    for (const subgrupo1 in passivoPorSubgrupo1) { relatorioFinal.passivo[subgrupo1] = groupBy(passivoPorSubgrupo1[subgrupo1], 'subgrupo2'); }
    const plPorSubgrupo1 = groupBy(saldos.filter(c => c.grupo_contabil === 'Patrimônio Líquido'), 'subgrupo1');
    for (const subgrupo1 in plPorSubgrupo1) { relatorioFinal.patrimonioLiquido[subgrupo1] = groupBy(plPorSubgrupo1[subgrupo1], 'subgrupo2'); }
    
    return res.status(200).json(relatorioFinal);
});

app.get("/api/livro-razao/:contaId", (req: Request, res: Response) => {
    const contaId = parseInt(req.params.contaId, 10);
    const contaSelecionada = contas.find(c => c.id === contaId);
    if (!contaSelecionada) return res.status(404).json({ message: "Conta não encontrada" });
    const movimentos = lancamentos.filter(l => l.contaDebitoId === contaId || l.contaCreditoId === contaId).map(l => ({ data: l.data, historico: l.historico, debito: l.contaDebitoId === contaId ? l.valor : 0, credito: l.contaCreditoId === contaId ? l.valor : 0, }));
    const totalDebito = movimentos.reduce((s, m) => s + m.debito, 0);
    const totalCredito = movimentos.reduce((s, m) => s + m.credito, 0);
    return res.status(200).json({ conta: contaSelecionada, movimentos, totalDebito, totalCredito, saldoFinal: totalDebito - totalCredito });
});

export default app;