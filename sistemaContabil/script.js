document.addEventListener('DOMContentLoaded', () => {
  const API_URL = '/api';
  let todasAsContas = [];

  // Elementos principais
  const tabelaContasCorpo = document.getElementById('tabela-contas-corpo');
  const modal = document.getElementById('modal-nova-conta');
  const btnAdicionar = document.getElementById('btnAdicionarConta');
  const btnFecharModal = document.querySelector('.close-button');
  const formNovaConta = document.getElementById('form-nova-conta');

  const selectContaDebito = document.getElementById('conta-debito');
  const selectContaCredito = document.getElementById('conta-credito');
  const filtroContaRazao = document.getElementById('filtro-conta-razao');

  // --- FUNÇÕES DE CONTAS ---
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

  // --- CRIAR CONTA ---
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

  // Inicialização
  btnAdicionar.addEventListener('click', toggleModal);
  btnFecharModal.addEventListener('click', toggleModal);
  carregarContas().then(popularDropdownsContas);
});
