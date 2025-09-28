document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://localhost:3333/api';
  let todasAsContas = [];

  // Elementos de NAVEGAÇÃO
  const menuItems = document.querySelectorAll('.menu li');
  const pages = document.querySelectorAll('.page');

  // Elementos do DOM: Setup de Contas
  const tabelaContasCorpo = document.getElementById('tabela-contas-corpo');
  const modal = document.getElementById('modal-nova-conta');
  const btnAdicionar = document.getElementById('btnAdicionarConta');
  const btnFecharModal = document.querySelector('.close-button');
  const formNovaConta = document.getElementById('form-nova-conta');

  // Elementos do DOM: Livro Diário
  const formNovoLancamento = document.getElementById('form-novo-lancamento');
  const selectContaDebito = document.getElementById('conta-debito');
  const selectContaCredito = document.getElementById('conta-credito');
  const tabelaLancamentosCorpo = document.getElementById('tabela-lancamentos-corpo');

  // Elementos do DOM: Balanço Patrimonial
  const btnGerarBalanco = document.getElementById('btnGerarBalanco');
  const ladoAtivoDiv = document.getElementById('lado-ativo');
  const ladoPassivoPlDiv = document.getElementById('lado-passivo-pl');
  const dataReferenciaElement = document.getElementById('data-referencia');

  // NOVO: Elementos do DOM: Livro Razão
  const filtroContaRazao = document.getElementById('filtro-conta-razao');
  const btnGerarRazao = document.getElementById('btnGerarRazao');
  const resultadoRazaoDiv = document.getElementById('resultado-razao');
  const nomeContaRazaoH2 = document.getElementById('nome-conta-razao');
  const tabelaRazaoCorpo = document.getElementById('tabela-razao-corpo');
  const tabelaRazaoRodape = document.getElementById('tabela-razao-rodape');

  // --- FUNÇÃO DE NAVEGAÇÃO ---
  function showPage(pageId){pages.forEach(p=>p.classList.remove('active'));menuItems.forEach(i=>i.classList.remove('active'));document.getElementById(`page-${pageId}`)?.classList.add('active');document.querySelector(`.menu li[data-page="${pageId}"]`)?.classList.add('active')}

  // --- FUNÇÕES: Setup de Contas ---
  async function carregarContas(){try{const response=await fetch(`${API_URL}/contas`);todasAsContas=await response.json();tabelaContasCorpo.innerHTML='';todasAsContas.forEach(c=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${c.codigo}</td><td>${c.nome_conta}</td><td>${c.grupo_contabil}</td><td>${c.subgrupo1}</td><td>${c.subgrupo2}</td>`;tabelaContasCorpo.appendChild(tr)})}catch(e){console.error('Erro ao carregar contas:',e)}}
  function toggleModal(){modal.style.display=(modal.style.display==='block')?'none':'block'}
  formNovaConta.addEventListener('submit',async e=>{e.preventDefault();const n={codigo:document.getElementById('codigo').value,nome_conta:document.getElementById('nome_conta').value,grupo_contabil:document.getElementById('grupo_contabil').value,subgrupo1:document.getElementById('subgrupo1').value,subgrupo2:document.getElementById('subgrupo2').value};try{await fetch(`${API_URL}/contas`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(n)});formNovaConta.reset();toggleModal();await carregarContas();await popularDropdownsContas()}catch(e){console.error('Erro ao criar conta:',e)}});
  
  // --- FUNÇÕES: Livro Diário ---
  async function popularDropdownsContas(){selectContaDebito.innerHTML='<option value="">Selecione...</option>';selectContaCredito.innerHTML='<option value="">Selecione...</option>';filtroContaRazao.innerHTML='<option value="">Selecione uma conta...</option>';todasAsContas.forEach(c=>{const o=`<option value="${c.id}">${c.codigo} - ${c.nome_conta}</option>`;selectContaDebito.innerHTML+=o;selectContaCredito.innerHTML+=o;filtroContaRazao.innerHTML+=o})}
  async function carregarLancamentos(){try{const response=await fetch(`${API_URL}/lancamentos`);const l=await response.json();tabelaLancamentosCorpo.innerHTML='';l.forEach(c=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${c.data}</td><td>${c.historico}</td><td>${c.nomeContaDebito}</td><td>${c.nomeContaCredito}</td><td>${c.valor.toFixed(2)}</td>`;tabelaLancamentosCorpo.appendChild(tr)})}catch(e){console.error('Erro ao carregar lançamentos:',e)}}
  formNovoLancamento.addEventListener('submit',async e=>{e.preventDefault();const n={contaDebitoId:document.getElementById('conta-debito').value,contaCreditoId:document.getElementById('conta-credito').value,valor:document.getElementById('valor').value,historico:document.getElementById('historico').value};try{await fetch(`${API_URL}/lancamentos`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(n)});formNovoLancamento.reset();await carregarLancamentos()}catch(e){console.error('Erro ao salvar lançamento:',e)}});

  // --- FUNÇÕES: Balanço Patrimonial (Versão Dinâmica) ---
  function renderizarContas(contas, grupoPai) { /* ...código existente... */ return { html, total }; }
  function renderizarGrupos(grupos, grupoPai) { /* ...código existente... */ return { html, total }; }
  async function gerarBalancoPatrimonial() { /* ...código existente... */ }

  // --- NOVO: FUNÇÕES: Livro Razão ---
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
      
      nomeContaRazaoH2.textContent = `Razão da Conta: ${dadosRazao.conta.codigo} - ${dadosRazao.conta.nome_conta}`;
      tabelaRazaoCorpo.innerHTML = ''; // Limpa a tabela
      
      let saldoCorrente = 0; // Para a coluna de saldo
      // NOTA: Em um sistema real, aqui entraria o Saldo Inicial do período.
      
      dadosRazao.movimentos.forEach(mov => {
        // Atualiza o saldo corrente a cada linha
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

      // Atualiza o rodapé com os totais
      tabelaRazaoRodape.innerHTML = `
        <tr>
          <td colspan="2">TOTAIS DO PERÍODO</td>
          <td>${dadosRazao.totalDebito.toFixed(2)}</td>
          <td>${dadosRazao.totalCredito.toFixed(2)}</td>
          <td><strong>${dadosRazao.saldoFinal.toFixed(2)}</strong></td>
        </tr>
      `;

      resultadoRazaoDiv.style.display = 'block'; // Mostra a tabela de resultados

    } catch(error) {
      console.error('Erro ao gerar Livro Razão:', error);
      alert('Não foi possível gerar o relatório do Livro Razão.');
    }
  }

  // --- INICIALIZAÇÃO DA PÁGINA ---
  async function inicializar() {
    menuItems.forEach(item => item.addEventListener('click', () => showPage(item.dataset.page)));
    btnAdicionar.addEventListener('click', toggleModal);
    btnFecharModal.addEventListener('click', toggleModal);
    btnGerarBalanco.addEventListener('click', gerarBalancoPatrimonial);
    btnGerarRazao.addEventListener('click', gerarLivroRazao); // Conecta o novo botão
    
    await carregarContas();
    await popularDropdownsContas(); // Esta função agora também popula o filtro do razão
    await carregarLancamentos();
    showPage('setup');

    if (dataReferenciaElement) {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        dataReferenciaElement.textContent = `${dia}/${mes}/${ano}`;
    }
  }

  inicializar();
});