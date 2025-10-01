import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {

  onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado! Mostra o nome no console.
        console.log("Acesso permitido para:", user.displayName);
    } else {
        // Usuário não está logado! Redireciona para a tela de login.
        console.log("Acesso negado. Redirecionando para login...");
        window.location.href = 'login.html';
    } 
  });

  const API_URL = '/api';
  let todasAsContas = [];

  // --- ELEMENTOS PRINCIPAIS ---
  const tabelaContasCorpo = document.getElementById('tabela-contas-corpo');
  const modal = document.getElementById('modal-nova-conta');
  const btnAdicionar = document.getElementById('btnAdicionarConta');
  const btnFecharModal = document.querySelector('.close-button');
  const formNovaConta = document.getElementById('form-nova-conta');

  const selectContaDebito = document.getElementById('conta-debito');
  const selectContaCredito = document.getElementById('conta-credito');
  const filtroContaRazao = document.getElementById('filtro-conta-razao');
  const btnGerarRazao = document.getElementById('btnGerarRazao');
  const btnGerarBalanco = document.getElementById('btnGerarBalanco');

  // --- ELEMENTOS DO Balanço Patrimonial ---
  const ladoAtivoDiv = document.getElementById('lado-ativo');
  const ladoPassivoPlDiv = document.getElementById('lado-passivo-pl');
  const dataReferenciaElement = document.getElementById('data-referencia');

  // --- ELEMENTOS DO Livro Razão ---
  const resultadoRazaoDiv = document.getElementById('resultado-razao');
  const nomeContaRazaoH2 = document.getElementById('nome-conta-razao');
  const tabelaRazaoCorpo = document.getElementById('tabela-razao-corpo');
  const tabelaRazaoRodape = document.getElementById('tabela-razao-rodape');

  // --- ELEMENTOS: Livro Diário ---
  const formNovoLancamento = document.getElementById('form-novo-lancamento');
  const tabelaLancamentosCorpo = document.getElementById('tabela-lancamentos-corpo');

  // --- NAVEGAÇÃO ---
  const menuItems = document.querySelectorAll('.menu li');
  const pages = document.querySelectorAll('.page');

  function showPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    menuItems.forEach(i => i.classList.remove('active'));
    document.getElementById(`page-${pageId}`)?.classList.add('active');
    document.querySelector(`.menu li[data-page="${pageId}"]`)?.classList.add('active');
  }

  // --- CONTAS ---
  async function carregarContas() {
    try {
      const response = await fetch(`${API_URL}/contas`);
      todasAsContas = await response.json();
      tabelaContasCorpo.innerHTML = '';
      todasAsContas.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.codigo}</td>
          <td>${c.nome_conta}</td>
          <td>${c.grupo_contabil}</td>
          <td>${c.subgrupo1}</td>
          <td>${c.subgrupo2}</td>
        `;
        tabelaContasCorpo.appendChild(tr);
      });
    } catch (e) {
      console.error('Erro ao carregar contas:', e);
    }
  }

  function toggleModal() {
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
  }

  formNovaConta.addEventListener('submit', async e => {
    e.preventDefault();
    const novaConta = {
      codigo: document.getElementById('codigo').value,
      nome_conta: document.getElementById('nome_conta').value,
      grupo_contabil: document.getElementById('grupo_contabil').value,
      subgrupo1: document.getElementById('subgrupo1').value,
      subgrupo2: document.getElementById('subgrupo2').value
    };

    try {
      const response = await fetch(`${API_URL}/contas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaConta)
      });
      if (!response.ok) throw new Error('Erro ao criar conta');
      const contaCriada = await response.json();

      todasAsContas.push(contaCriada);
      formNovaConta.reset();
      toggleModal();
      await carregarContas();
      await popularDropdownsContas();
    } catch (e) {
      console.error('Erro ao criar conta:', e);
      alert('Não foi possível salvar a conta.');
    }
  });

  // --- DROPDOWNS ---
  async function popularDropdownsContas() {
    selectContaDebito.innerHTML = '<option value="">Selecione...</option>';
    selectContaCredito.innerHTML = '<option value="">Selecione...</option>';
    filtroContaRazao.innerHTML = '<option value="">Selecione uma conta...</option>';

    todasAsContas.forEach(c => {
      const option = `<option value="${c.id}">${c.codigo} - ${c.nome_conta}</option>`;
      selectContaDebito.innerHTML += option;
      selectContaCredito.innerHTML += option;
      filtroContaRazao.innerHTML += option;
    });
  }

  // --- LANÇAMENTOS ---
  async function carregarLancamentos() {
    try {
      const response = await fetch(`${API_URL}/lancamentos`);
      const lancamentos = await response.json();
      tabelaLancamentosCorpo.innerHTML = '';

      lancamentos.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${l.data}</td>
          <td>${l.historico}</td>
          <td>${l.nomeContaDebito}</td>
          <td>${l.nomeContaCredito}</td>
          <td>${l.valor.toFixed(2)}</td>
        `;
        tabelaLancamentosCorpo.appendChild(tr);
      });
    } catch (e) {
      console.error('Erro ao carregar lançamentos:', e);
    }
  }

  formNovoLancamento.addEventListener('submit', async e => {
    e.preventDefault();
    const novoLancamento = {
      contaDebitoId: document.getElementById('conta-debito').value,
      contaCreditoId: document.getElementById('conta-credito').value,
      valor: document.getElementById('valor').value,
      historico: document.getElementById('historico').value
    };

    try {
      const response = await fetch(`${API_URL}/lancamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoLancamento)
      });
      if (!response.ok) throw new Error('Erro ao salvar lançamento');

      formNovoLancamento.reset();
      await carregarLancamentos();
    } catch (e) {
      console.error('Erro ao salvar lançamento:', e);
      alert('Não foi possível salvar o lançamento.');
    }
  });

  async function gerarLivroRazao() {
    const contaId = filtroContaRazao.value;
    if (!contaId) {
      alert('Por favor, selecione uma conta para gerar o razão.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/livro-razao/${contaId}`);
      if (!response.ok) throw new Error('Erro ao buscar dados do razão.');

      const dadosRazao = await response.json();
      
      // Coloca o título com o nome da conta selecionada
      nomeContaRazaoH2.textContent = `Razão da Conta: ${dadosRazao.conta.codigo} - ${dadosRazao.conta.nome_conta}`;
      tabelaRazaoCorpo.innerHTML = ''; // Limpa a tabela
      
      let saldoCorrente = 0; // Variável para calcular o saldo a cada linha
      
      // Cria uma linha <tr> para cada movimento da conta
      dadosRazao.movimentos.forEach(mov => {
        saldoCorrente += mov.credito - mov.debito;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${mov.data}</td>
          <td>${mov.historico}</td>
          <td>${mov.debito > 0 ? mov.debito.toFixed(2) : '-'}</td>
          <td>${mov.credito > 0 ? mov.credito.toFixed(2) : '-'}</td>
          <td>${saldoCorrente.toFixed(2)}</td>
        `;
        tabelaRazaoCorpo.appendChild(tr);
      });

      // Cria o rodapé da tabela com os totais
      tabelaRazaoRodape.innerHTML = `
        <tr>
          <td colspan="2">TOTAIS DO PERÍODO</td>
          <td>${dadosRazao.totalDebito.toFixed(2)}</td>
          <td>${dadosRazao.totalCredito.toFixed(2)}</td>
          <td><strong>${dadosRazao.saldoFinal.toFixed(2)}</strong></td>
        </tr>
      `;

      // Mostra a div de resultados que estava escondida
      resultadoRazaoDiv.style.display = 'block';

    } catch(error) {
      console.error('Erro ao gerar Livro Razão:', error);
      alert('Não foi possível gerar o relatório do Livro Razão.');
    }
  }

  // Função para renderizar contas e retornar HTML e soma dos saldos
function renderizarContasLista(contas, grupoPai) {
  let html = '';
  let total = 0;
  
  contas.forEach(conta => {
    html += `<div class="balanco-conta"><span>${conta.nome_conta}</span><span>${conta.saldo.toFixed(2)}</span></div>`;
    total += conta.saldo;
  });

  return { html, total };
}

// Função que usa a função acima para renderizar grupos e subgrupos
function renderizarGrupos(grupos, grupoPai) {
  let html = '';
  let total = 0;
  const chavesGrupos = Object.keys(grupos);

  chavesGrupos.forEach(chaveGrupo => {
    html += `<div class="balanco-grupo-titulo">${chaveGrupo}</div>`;
    const subgrupos = grupos[chaveGrupo];
    const chavesSubgrupos = Object.keys(subgrupos);

    chavesSubgrupos.forEach(chaveSubgrupo => {
      if (chaveSubgrupo && chaveSubgrupo.trim() !== '') {
        html += `<div class="balanco-subgrupo-titulo">&nbsp;&nbsp;<strong>${chaveSubgrupo}</strong></div>`;
      }
      let contas = subgrupos[chaveSubgrupo];
      
      if (!Array.isArray(contas)) {
        if (contas && typeof contas === 'object') {
          contas = [contas];  // transforma objeto único em array com 1 elemento
        } else {
          console.warn('Contas não é um array nem objeto válido, ignorando:', contas);
          contas = [];
        }
      }

      const resultadoContas = renderizarContasLista(contas, grupoPai);
      html += resultadoContas.html;
      total += resultadoContas.total;
    });
  });

  return { html, total };
}


// Função async para buscar dados e renderizar o balanço
async function renderizarContas() {
  const response = await fetch('/api/balanco-patrimonial');
  if (!response.ok) {
    console.error("Erro ao buscar balanco patrimonial");
    return;
  }
  const data = await response.json();

  const container = document.getElementById('balanco-container');
  container.innerHTML = '';

  // Renderiza Ativo
  const ativoResultado = renderizarGrupos(data.ativo, 'ativo');
  const ladoAtivo = document.createElement('div');
  ladoAtivo.classList.add('balanco-lado');
  ladoAtivo.innerHTML = `<div class="balanco-header">ATIVO</div>` + ativoResultado.html;

  // Renderiza Passivo e Patrimônio Líquido
  const passivoPlResultado = renderizarGrupos({
    ...data.passivo,
    "Patrimônio Líquido": data.patrimonioLiquido
  }, 'passivo-pl');

  const ladoPassivoPl = document.createElement('div');
  ladoPassivoPl.classList.add('balanco-lado');
  ladoPassivoPl.innerHTML = `<div class="balanco-header">PASSIVO E PATRIMÔNIO LÍQUIDO</div>` + passivoPlResultado.html;

  container.appendChild(ladoAtivo);
  container.appendChild(ladoPassivoPl);
}

   
  async function gerarBalancoPatrimonial() {
    try {
      const response = await fetch(`${API_URL}/balanco-patrimonial`);
      const relatorio = await response.json();
      
      // Chama a função auxiliar para desenhar o lado do ATIVO
      const resultadoAtivo = renderizarGrupos(relatorio.ativo, 'Ativo');
      ladoAtivoDiv.innerHTML = `<div class="balanco-header">ATIVO</div><div class="balanco-grupo">${resultadoAtivo.html}</div><div class="balanco-total"><span>TOTAL ATIVO</span><span>${resultadoAtivo.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>`;
      
      // Chama a função auxiliar para desenhar o lado do PASSIVO e do PL
      const resultadoPassivo = renderizarGrupos(relatorio.passivo, 'Passivo');
      const resultadoPL = renderizarGrupos(relatorio.patrimonioLiquido, 'Patrimônio Líquido');
      const totalPassivoPL = resultadoPassivo.total + resultadoPL.total;
      ladoPassivoPlDiv.innerHTML = `<div class="balanco-header">PASSIVO E PATRIMÔNIO LÍQUIDO</div><div class="balanco-grupo">${resultadoPassivo.html}</div><div class="balanco-grupo">${resultadoPL.html}</div><div class="balanco-total"><span>TOTAL PASSIVO + PL</span><span>${totalPassivoPL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>`;
    
    } catch (error) { 
        console.error('Erro ao gerar Balanço Patrimonial:', error); 
    }
  }

  // --- INICIALIZAÇÃO ---
  function inicializar() {
    menuItems.forEach(item =>
      item.addEventListener('click', () => showPage(item.dataset.page))
    );
    btnAdicionar.addEventListener('click', toggleModal);
    btnFecharModal.addEventListener('click', toggleModal);
    btnGerarBalanco.addEventListener('click', gerarBalancoPatrimonial);
    btnGerarRazao.addEventListener('click', gerarLivroRazao);

    carregarContas().then(popularDropdownsContas);
    carregarLancamentos();

    showPage('setup');

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth).then(() => {
                console.log("Logout bem-sucedido.");
                // A página irá recarregar e o "porteiro" fará o redirecionamento.
            }).catch(error => {
                console.error("Erro no logout:", error);
            });
        });
    }
  }
  if (dataReferenciaElement) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0'); // Mês começa em 0, então somamos 1
    const ano = hoje.getFullYear();
    dataReferenciaElement.textContent = `${dia}/${mes}/${ano}`;
}

  inicializar();
});


  
