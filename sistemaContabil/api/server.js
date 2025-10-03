"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const firebase_1 = require("../firebase");

const app = (0, express_1.default)();
const PORT = process.env.PORT || 3333;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Servir frontend
const publicPath = path_1.default.join(__dirname, "../");
app.use(express_1.default.static(publicPath));
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(process.cwd(), "index.html"));
    res.sendFile(path_1.default.join(process.cwd(), "style.css"));
    res.sendFile(path_1.default.join(process.cwd(), "script.js"));
    res.sendFile(path_1.default.join(process.cwd(), "login.html"));
    res.sendFile(path_1.default.join(process.cwd(), "login.js"));
});
// --- Criar contas padrão ---
const criarContasPadrao = async () => {
    const snapshot = await firebase_1.db.ref("contas").once("value");
    if (!snapshot.exists()) {
        const contasPadrao = [
            { id: 1, codigo: "1.1.01.001", nome_conta: "Caixa Geral", grupo_contabil: "Ativo", subgrupo1: "Ativo Circulante", subgrupo2: "Disponibilidades" },
            { id: 2, codigo: "2.1.01.001", nome_conta: "Fornecedores Nacionais", grupo_contabil: "Passivo", subgrupo1: "Passivo Circulante", subgrupo2: "Obrigações" },
            { id: 3, codigo: "3.1.01.001", nome_conta: "Capital Social", grupo_contabil: "Patrimônio Líquido", subgrupo1: "Capital", subgrupo2: "-" },
        ];
        for (const conta of contasPadrao) {
            const ref = firebase_1.db.ref("contas").push();
            await ref.set(conta);
        }
    }
};
criarContasPadrao();
const groupBy = (array, key) => {
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
app.get("/api/contas", async (req, res) => {
    const snapshot = await firebase_1.db.ref("contas").once("value");
    const contas = snapshot.val() ? Object.values(snapshot.val()) : [];
    return res.status(200).json(contas);
});
app.post("/api/contas", async (req, res) => {
    const { codigo, nome_conta, grupo_contabil, subgrupo1, subgrupo2 } = req.body;
    const ref = firebase_1.db.ref("contas").push();
    const novaConta = {
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
app.get("/api/lancamentos", async (req, res) => {
    const contasSnap = await firebase_1.db.ref("contas").once("value");
    const lancSnap = await firebase_1.db.ref("lancamentos").once("value");
    const contas = contasSnap.val() ?
        Object.values(contasSnap.val()) : [];
    const lancamentos = lancSnap.val() ?
        Object.values(lancSnap.val()) : [];
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
app.post("/api/lancamentos", async (req, res) => { const { historico, valor, contaDebitoId, contaCreditoId } = req.body; const ref = firebase_1.db.ref("lancamentos").push(); const novoLancamento = { id: Date.now(), data: new Date().toLocaleDateString("pt-BR"), historico, valor: parseFloat(valor), contaDebitoId: parseInt(contaDebitoId), contaCreditoId: parseInt(contaCreditoId), }; await ref.set(novoLancamento); return res.status(201).json(novoLancamento); });
// --- ROTAS BALANCETE, BALANÇO PATRIMONIAL E LIVRO RAZÃO 
app.get("/api/balancete", async (req, res) => { const contasSnap = await firebase_1.db.ref("contas").once("value"); const lancSnap = await firebase_1.db.ref("lancamentos").once("value"); const contas = contasSnap.val() ? Object.values(contasSnap.val()) : []; const lancamentos = lancSnap.val() ? Object.values(lancSnap.val()) : []; const balancete = contas.map((conta) => { const totalDebito = lancamentos.filter(l => l.contaDebitoId === conta.id).reduce((s, l) => s + l.valor, 0); const totalCredito = lancamentos.filter(l => l.contaCreditoId === conta.id).reduce((s, l) => s + l.valor, 0); return { codigo: conta.codigo, nome_conta: conta.nome_conta, totalDebito, totalCredito, saldoFinal: totalDebito - totalCredito, }; }); const balanceteFiltrado = balancete.filter(item => item.totalDebito > 0 || item.totalCredito > 0); return res.status(200).json(balanceteFiltrado); });
// Balanço Patrimonial 
// Balanço Patrimonial (VERSÃO FINAL E CORRETA)
app.get("/api/balanco-patrimonial", async (req, res) => {
    try {
        const contasSnap = await firebase_1.db.ref("contas").once("value");
        const lancSnap = await firebase_1.db.ref("lancamentos").once("value");
        // Helper para transformar a resposta do Firebase (objeto) em um array com IDs
        const firebaseObjectToArray = (snapshotVal) => {
            if (!snapshotVal)
                return [];
            return Object.entries(snapshotVal).map(([id, data]) => ({ id, ...data }));
        };
        const contas = firebaseObjectToArray(contasSnap.val());
        const lancamentos = firebaseObjectToArray(lancSnap.val());
        const saldos = contas.map((conta) => {
            const totalDebito = lancamentos.filter((l) => l.contaDebitoId === conta.id).reduce((s, l) => s + l.valor, 0);
            const totalCredito = lancamentos.filter((l) => l.contaCreditoId === conta.id).reduce((s, l) => s + l.valor, 0);
            return { ...conta, saldo: totalDebito - totalCredito };
        }).filter((c) => c.saldo !== 0);
        // A função groupBy que já corrigimos
        const groupBy = (array, key) => {
            return array.reduce((result, currentValue) => {
                const groupKey = currentValue[key] || 'Sem Subgrupo';
                if (!result[groupKey]) {
                    result[groupKey] = [];
                }
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
        const ativoPorSubgrupo1 = groupBy(saldos.filter((c) => c.grupo_contabil === 'Ativo'), 'subgrupo1');
        for (const subgrupo1 in ativoPorSubgrupo1) {
            relatorioFinal.ativo[subgrupo1] = groupBy(ativoPorSubgrupo1[subgrupo1], 'subgrupo2');
        }
        const passivoPorSubgrupo1 = groupBy(saldos.filter((c) => c.grupo_contabil === 'Passivo'), 'subgrupo1');
        for (const subgrupo1 in passivoPorSubgrupo1) {
            relatorioFinal.passivo[subgrupo1] = groupBy(passivoPorSubgrupo1[subgrupo1], 'subgrupo2');
        }
        const plPorSubgrupo1 = groupBy(saldos.filter((c) => c.grupo_contabil === 'Patrimônio Líquido'), 'subgrupo1');
        for (const subgrupo1 in plPorSubgrupo1) {
            relatorioFinal.patrimonioLiquido[subgrupo1] = groupBy(plPorSubgrupo1[subgrupo1], 'subgrupo2');
        }
        return res.status(200).json(relatorioFinal);
    }
    catch (error) {
        console.error("Erro ao gerar balanço:", error);
        return res.status(500).json({ message: "Erro interno no servidor ao gerar balanço." });
    }
});
// Livro Razão 
app.get("/api/livro-razao/:contaId", async (req, res) => { const contaId = parseInt(req.params.contaId, 10); const contasSnap = await firebase_1.db.ref("contas").once("value"); const lancSnap = await firebase_1.db.ref("lancamentos").once("value"); const contas = contasSnap.val() ? Object.values(contasSnap.val()) : []; const lancamentos = lancSnap.val() ? Object.values(lancSnap.val()) : []; const contaSelecionada = contas.find(c => c.id === contaId); if (!contaSelecionada)
    return res.status(404).json({ message: "Conta não encontrada" }); const movimentos = lancamentos.filter(l => l.contaDebitoId === contaId || l.contaCreditoId === contaId).map(l => ({ data: l.data, historico: l.historico, debito: l.contaDebitoId === contaId ? l.valor : 0, credito: l.contaCreditoId === contaId ? l.valor : 0, })); const totalDebito = movimentos.reduce((s, m) => s + m.debito, 0); const totalCredito = movimentos.reduce((s, m) => s + m.credito, 0); const saldoFinal = totalDebito - totalCredito; return res.status(200).json({ conta: contaSelecionada, movimentos, totalDebito, totalCredito, saldoFinal, }); });
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});
exports.default = app;
