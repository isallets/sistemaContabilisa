document.addEventListener('DOMContentLoaded', () => {
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

  // --- INICIALIZAÇÃO ---
  function inicializar() {
    menuItems.forEach(item =>
      item.addEventListener('click', () => showPage(item.dataset.page))
    );
    btnAdicionar.addEventListener('click', toggleModal);
    btnFecharModal.addEventListener('click', toggleModal);

    carregarContas().then(popularDropdownsContas);
    carregarLancamentos();

    showPage('setup');
  }

  inicializar();
});

function gerarRelatorioRazao() {
   const contaId = filtroContaRazao.value;
   if (!contaId) {
    alert("Selecione uma conta para gerar o razão.");
    return;
   }
   // Chamada à API ou geração de relatório
   fetch(`${API_URL}/razao/${contaId}`)
    .then(response => response.json())
    .then(dados => {
     console.log("Razão da conta:", dados);
     // Aqui você pode exibir os dados em uma tabela, modal, etc.
    })
    .catch(e => {
     console.error("Erro ao gerar razão:", e);
     alert("Erro ao gerar razão.");
    });
  }
  
  function gerarBalanco() {
   fetch(`${API_URL}/balanco`)
    .then(response => response.json())
    .then(dados => {
     console.log("Balanço:", dados);
     // Aqui você pode exibir os dados em uma tabela, modal, etc.
    })
    .catch(e => {
     console.error("Erro ao gerar balanço:", e);
     alert("Erro ao gerar balanço.");
    });
  }
  
