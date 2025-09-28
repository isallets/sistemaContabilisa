"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Servir frontend
const publicPath = path_1.default.join(__dirname, '../');
app.use(express_1.default.static(publicPath));
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(publicPath, '../index.html'));
});
// Array para o Plano de Contas
let contas = [
    { id: 1, codigo: "1.1.01.001", nome_conta: "Caixa Geral", grupo_contabil: "Ativo", subgrupo1: "Ativo Circulante", subgrupo2: "Disponibilidades" },
    { id: 2, codigo: "2.1.01.001", nome_conta: "Fornecedores Nacionais", grupo_contabil: "Passivo", subgrupo1: "Passivo Circulante", subgrupo2: "Obrigações" },
    { id: 3, codigo: "3.1.01.001", nome_conta: "Capital Social", grupo_contabil: "Patrimônio Líquido", subgrupo1: "Capital", subgrupo2: "-" },
];
let proximoContaId = 4;
// Array para Lançamentos
let lancamentos = [];
let proximoLancamentoId = 1;
// --- ROTAS PARA CONTAS ---
app.get('/api/contas', (req, res) => {
    return res.status(200).json(contas);
});
app.post('/api/contas', (req, res) => {
    const { codigo, nome_conta, grupo_contabil, subgrupo1, subgrupo2 } = req.body;
    const novaConta = { id: proximoContaId++, codigo, nome_conta, grupo_contabil, subgrupo1, subgrupo2 };
    contas.push(novaConta);
    return res.status(201).json(novaConta);
});
// --- ROTAS PARA LANÇAMENTOS ---
app.get('/api/lancamentos', (req, res) => {
    const lancamentosComNomes = lancamentos.map(lanc => {
        const contaDebito = contas.find(c => c.id === lanc.contaDebitoId);
        const contaCredito = contas.find(c => c.id === lanc.contaCreditoId);
        return { ...lanc, nomeContaDebito: contaDebito?.nome_conta, nomeContaCredito: contaCredito?.nome_conta };
    });
    return res.status(200).json(lancamentosComNomes);
});
app.post('/api/lancamentos', (req, res) => {
    const { historico, valor, contaDebitoId, contaCreditoId } = req.body;
    const novoLancamento = {
        id: proximoLancamentoId++,
        data: new Date().toLocaleDateString('pt-BR'),
        historico,
        valor: parseFloat(valor),
        contaDebitoId: parseInt(contaDebitoId),
        contaCreditoId: parseInt(contaCreditoId),
    };
    lancamentos.push(novoLancamento);
    return res.status(201).json(novoLancamento);
});
// --- ROTA BALANCETE ---
app.get('/api/balancete', (req, res) => {
    console.log('Gerando balancete...');
    const balancete = contas.map(conta => {
        const totalDebito = lancamentos
            .filter(lanc => lanc.contaDebitoId === conta.id)
            .reduce((soma, lanc) => soma + lanc.valor, 0);
        const totalCredito = lancamentos
            .filter(lanc => lanc.contaCreditoId === conta.id)
            .reduce((soma, lanc) => soma + lanc.valor, 0);
        return {
            codigo: conta.codigo,
            nome_conta: conta.nome_conta,
            totalDebito,
            totalCredito,
            saldoFinal: totalDebito - totalCredito,
        };
    });
    const balanceteFiltrado = balancete.filter(item => item.totalDebito > 0 || item.totalCredito > 0);
    return res.status(200).json(balanceteFiltrado);
});
// --- ROTA BALANÇO PATRIMONIAL ---
app.get('/api/balanco-patrimonial', (req, res) => {
    console.log('Gerando Balanço Patrimonial...');
    const saldos = contas
        .map(conta => {
        const totalDebito = lancamentos
            .filter(lanc => lanc.contaDebitoId === conta.id)
            .reduce((soma, lanc) => soma + lanc.valor, 0);
        const totalCredito = lancamentos
            .filter(lanc => lanc.contaCreditoId === conta.id)
            .reduce((soma, lanc) => soma + lanc.valor, 0);
        return {
            ...conta,
            saldo: totalDebito - totalCredito,
        };
    })
        .filter(conta => conta.saldo !== 0);
    const relatorio = {
        ativo: {
            circulante: saldos.filter(c => c.subgrupo1 === 'Ativo Circulante'),
            naoCirculante: saldos.filter(c => c.subgrupo1 === 'Ativo Não Circulante'),
        },
        passivo: {
            circulante: saldos.filter(c => c.subgrupo1 === 'Passivo Circulante'),
            naoCirculante: saldos.filter(c => c.subgrupo1 === 'Passivo Não Circulante'),
        },
        patrimonioLiquido: saldos.filter(c => c.grupo_contabil === 'Patrimônio Líquido'),
    };
    return res.status(200).json(relatorio);
});
// --- ROTA LIVRO RAZÃO ---
app.get('/api/livro-razao/:contaId', (req, res) => {
    const contaId = parseInt(req.params.contaId, 10);
    const contaSelecionada = contas.find(c => c.id === contaId);
    if (!contaSelecionada) {
        return res.status(404).json({ message: "Conta não encontrada" });
    }
    console.log(`Gerando Livro Razão para a conta: ${contaSelecionada.nome_conta}`);
    const movimentos = lancamentos
        .filter(lanc => lanc.contaDebitoId === contaId || lanc.contaCreditoId === contaId)
        .map(lanc => {
        return {
            data: lanc.data,
            historico: lanc.historico,
            debito: lanc.contaDebitoId === contaId ? lanc.valor : 0,
            credito: lanc.contaCreditoId === contaId ? lanc.valor : 0,
        };
    });
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
exports.default = app;
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3333;
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}
