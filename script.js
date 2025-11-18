class Agencia {
    nome;
    numero; 
    banco; 
    #clientes = [];
    #contas = [];

    constructor(nome, banco) {
        this.nome = nome;
        this.banco = banco;
        this.numero = banco.proximoNumeroAgencia;
        banco.novaAgencia = this; 
    }

    set novoCliente(cliente) {
        this.#clientes.push(cliente);
    }

    set novaConta(conta) {
        this.#contas.push(conta);
    }

    buscarConta(numeroConta) {
        return this.#contas.find(c => c.numero === numeroConta);
    }

    get nomeCompleto() {
        return `${String(this.numero).padStart(3, '0')} - ${this.nome}`;
    }

    get clientes() {
        return this.#clientes;
    }

    get contas() {
        return this.#contas;
    }
}

class Banco {
    nome;
    #agencias = [];
    #logBC = []; 
    #proximoNumeroConta = 1;
    #proximoNumeroAgencia = 1; 

    constructor(nome) {
        this.nome = nome;
        console.log(`Banco ${this.nome} criado com sucesso!`);
    }

    set novaAgencia(agencia) {
        this.#agencias.push(agencia);
        console.log(`[Banco ${this.nome}]: Agência ${agencia.nomeCompleto} registrada.`);
    }

    get agencias() {
        return this.#agencias;
    }

    get proximoNumeroConta() {
        return this.#proximoNumeroConta++;
    }

    get proximoNumeroAgencia() {
        return this.#proximoNumeroAgencia++;
    }

    _registrarBC(tipo, valor, contaOrigen, contaDestino = null) {
        if (valor > 1000) {
            const log = {
                tipo,
                valor: valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                contaOrigen: contaOrigen.numero,
                data: new Date().toLocaleString('pt-BR')
            };
            if (contaDestino) {
                log.contaDestino = contaDestino.numero;
            }
            this.#logBC.push(log);
            console.warn(`[ALERTA BC]: ${tipo} de ${log.valor} da conta ${log.contaOrigen} registrado.`);
        }
    }

    buscarConta(numeroConta) {
        let contaEncontrada = null;
        for (const agencia of this.#agencias) {
            contaEncontrada = agencia.buscarConta(numeroConta);
            if (contaEncontrada) {
                break; 
            }
        }
        if (!contaEncontrada) {
            console.error(`Conta número ${numeroConta} não encontrada em nenhuma agência.`);
        }
        return contaEncontrada; 
    }

    depositar(numeroConta, valor) {
        const conta = this.buscarConta(numeroConta);
        if (!conta) return false; 
        if (valor <= 0) return false; 
        conta.executarDeposito(valor);
        return true; 
    }

    sacar(numeroConta, valor) {
        const conta = this.buscarConta(numeroConta);
        if (!conta) return false;
        if (valor <= 0) return false;
        return conta.executarSaque(valor, false); 
    }

    transferir(numContaOrigen, numContaDestino, valor) {
        const contaOrigen = this.buscarConta(numContaOrigen);
        const contaDestino = this.buscarConta(numContaDestino);
        if (!contaOrigen || !contaDestino) return false; 
        if (valor <= 0) return false;

        const sucessoSaque = contaOrigen.executarSaque(valor, true); 
        if (sucessoSaque) {
            contaDestino.executarDeposito(valor, true); 
            console.log(`Transferência de R$${valor} da conta ${numContaOrigen} para ${numContaDestino} realizada.`);
            this._registrarBC('Transferência', valor, contaOrigen, contaDestino);
            return true; 
        }
        return false; 
    }

    consultarExtrato(numeroConta) {
        const conta = this.buscarConta(numeroConta);
        if (conta) {
            conta.gerarExtrato();
            return true;
        }
        return false;
    }

    verLogBC() {
        console.log("\n--- LOG BANCO CENTRAL ---");
        if (this.#logBC.length === 0) {
            console.log("Nenhuma movimentação de alto valor registrada.");
        } else {
            this.#logBC.forEach(log => console.log(JSON.stringify(log, null, 2)));
        }
        console.log("---------------------------------------------------------\n");
    }

    visualizarEstrutura() {
        console.log(`\n--- ESTRUTURA DO BANCO ${this.nome} ---`);
        for (const agencia of this.#agencias) {
            console.log(`Agência: ${agencia.nomeCompleto}`);
            const clientes = agencia.clientes.map(c => c.nome);
            console.log(`  Clientes: ${clientes.length > 0 ? clientes.join(', ') : 'Nenhum'}`);
            const contas = agencia.contas.map(c => c.numero);
            console.log(`  Contas: ${contas.length > 0 ? contas.join(', ') : 'Nenhum'}`);
        }
        console.log("---------------------------------------\n");
    }
}

class Cliente {
    nome;
    cpf;
    agencia;
    #conta = null;

    constructor(nome, cpf, agencia) {
        this.nome = nome;
        this.cpf = cpf;
        this.agencia = agencia;
        agencia.novoCliente = this; 
    }

    set conta(contaInstance) {
        this.#conta = contaInstance;
    }

    get conta() {
        return this.#conta;
    }
}

class Conta {
    agencia;
    banco;
    numero;
    cliente;
    #saldo = 0;
    #transacoes = []; 

    constructor(cliente, agencia) {
        this.cliente = cliente;
        this.agencia = agencia;
        this.banco = agencia.banco;
        this.numero = this.banco.proximoNumeroConta;
        this.cliente.conta = this;
        agencia.novaConta = this;
        console.log(`[Agência ${this.agencia.nome}]: Conta ${this.numero} criada para ${this.cliente.nome}.`);
    }

    get saldo() {
        return this.#saldo;
    }

    get transacoes() {
        return this.#transacoes;
    }

    carregarDados(saldoSalvo, transacoesSalvas) {
        this.#saldo = saldoSalvo;
        this.#transacoes = transacoesSalvas;
    }

    #adicionarTransacao(descricao, valor) {
        const data = new Date().toLocaleString('pt-BR');
        this.#transacoes.push({ data, descricao, valor });
    }

    executarDeposito(valor, ehTransferencia = false) {
        this.#saldo += valor;
        const descricao = ehTransferencia ? `Valor Recebido` : "Depósito";
        this.#adicionarTransacao(descricao, valor);

        if (!ehTransferencia) {
            console.log(`Depósito de R$${valor} realizado na conta ${this.numero}. Saldo: R$${this.#saldo}`);
            this.banco._registrarBC("Depósito", valor, this);
        }
    }

    executarSaque(valor, ehTransferencia = false) {
        if (valor > this.#saldo) {
            console.error(`Erro: Saldo insuficiente na conta ${this.numero} (Saldo: R$${this.#saldo}).`);
            return false;
        }
        this.#saldo -= valor;
        const descricao = ehTransferencia ? `Valor Enviado` : "Saque";
        this.#adicionarTransacao(descricao, -valor); 

        if (!ehTransferencia) {
            console.log(`Saque de R$${valor} realizado na conta ${this.numero}. Saldo: R$${this.#saldo}`);
            this.banco._registrarBC("Saque", valor, this);
        }
        return true;
    }

    gerarExtrato() {
        console.log(`\n--- EXTRATO: ${this.cliente.nome} ---`);
        console.log(`Agência: ${this.agencia.nomeCompleto} | Conta: ${this.numero}`);
        console.log("---------------------------------------");
        if (this.#transacoes.length === 0) {
            console.log("Nenhuma movimentação registrada.");
        } else {
            this.#transacoes.forEach(t => {
                const valorFormatado = t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                console.log(`[${t.data}] ${t.descricao}: ${valorFormatado}`);
            });
        }
        console.log("---------------------------------------");
        const saldoFormatado = this.#saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        console.log(`SALDO ATUAL: ${saldoFormatado}`);
        console.log("---------------------------------------\n");
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const logDisplay = document.getElementById('display-terminal');

    function logToDisplay(message, type = 'log') {
        const p = document.createElement('p');
        if (typeof message === 'object' && message !== null) {
            p.textContent = JSON.stringify(message, null, 2);
        } else {
            p.textContent = message;
        }
        if (type === 'error') p.style.color = '#ff6b6b';
        else if (type === 'warn') p.style.color = '#f9ca24';
        else p.style.color = '#61dafb'; 
        logDisplay.appendChild(p);
        logDisplay.scrollTop = logDisplay.scrollHeight;
    }

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalTable = console.table; 

    console.log = (...args) => {
        const message = args.map(String).join(' ');
        originalLog.apply(console, args); 
        logToDisplay(message, 'log'); 
    };
    console.warn = (...args) => {
        const message = args.map(String).join(' ');
        originalWarn.apply(console, args);
        logToDisplay(`⚠️ ${message}`, 'warn'); 
    };
    console.error = (...args) => {
        const message = args.map(String).join(' ');
        originalError.apply(console, args);
        logToDisplay(`❌ ${message}`, 'error'); 
    };
    console.table = (data) => {
        originalTable(data);
        logToDisplay("--- Tabela ---");
        try { data.forEach(row => logToDisplay(JSON.stringify(row))); } 
        catch (e) { logToDisplay(JSON.stringify(data)); }
        logToDisplay("--------------");
    };

    console.log("--- INICIANDO SIMULAÇÃO BANCÁRIA ---");
    const jsBanco = new Banco("JS Bank");
    
    function salvarDados() {
       
        const dadosAgencias = jsBanco.agencias.map(ag => ag.nome);
        
        const dadosContas = [];
        
        jsBanco.agencias.forEach((ag, indexAgencia) => {
            ag.contas.forEach(conta => {
                dadosContas.push({
                    nomeCliente: conta.cliente.nome,
                    cpfCliente: conta.cliente.cpf,
                    indexAgencia: indexAgencia, // Salva em qual agência está (0, 1, 2...)
                    saldo: conta.saldo,
                    historico: conta.transacoes
                });
            });
        });

        const pacoteDeDados = {
            agencias: dadosAgencias,
            contas: dadosContas
        };

        localStorage.setItem('jsBankDados', JSON.stringify(pacoteDeDados));
        console.log("[SISTEMA] Dados salvos automaticamente.");
    }

    function carregarDados() {
        const dadosSalvos = localStorage.getItem('jsBankDados');
        
        if (!dadosSalvos) {
            console.log("[SISTEMA] Nenhum dado salvo encontrado. Iniciando padrão.");
            criarDadosIniciais(); // Se não tiver nada salvo, cria os dados de exemplo
            return;
        }

        console.log("[SISTEMA] Carregando dados salvos...");
        const pacote = JSON.parse(dadosSalvos);

        // 1. Recriar Agências
        pacote.agencias.forEach(nomeAgencia => {
            new Agencia(nomeAgencia, jsBanco);
        });

        // 2. Recriar Contas e Clientes
        pacote.contas.forEach(dado => {
            const agenciaObj = jsBanco.agencias[dado.indexAgencia];
            const cliente = new Cliente(dado.nomeCliente, dado.cpfCliente, agenciaObj);
            const conta = new Conta(cliente, agenciaObj);
            
            // "Injeta" o saldo e histórico antigo
            conta.carregarDados(dado.saldo, dado.historico);
        });

        console.log("[SISTEMA] Dados carregados com sucesso!");
    }

    function criarDadosIniciais() {
        const agCentro = new Agencia("Centro", jsBanco);
        const agBairro = new Agencia("Bairro", jsBanco);
        
        const alice = new Cliente("Alice Silva", "111.111.111-11", agCentro);
        const contaAlice = new Conta(alice, agCentro); 
        
        const beto = new Cliente("Beto Souza", "222.222.222-22", agBairro);
        const contaBeto = new Conta(beto, agBairro); 
        
        salvarDados();
    }

    carregarDados(); // Tenta carregar do localStorage

    function atualizarSelectAgencias() {
        const select = document.getElementById('cadastro-agencia');
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Selecione uma agência</option>';

        jsBanco.agencias.forEach((agencia, index) => {
            const option = document.createElement('option');
            option.value = index; 
            option.textContent = agencia.nomeCompleto; 
            select.appendChild(option);
        });
    }

    function atualizarListagem() {
        const bancoContainer = document.getElementById('lista-banco');
        const agenciasContainer = document.getElementById('lista-agencias');
        const clientesContasContainer = document.getElementById('lista-clientes-contas');

        if (!bancoContainer || !agenciasContainer || !clientesContasContainer) return; 

        bancoContainer.innerHTML = '';
        agenciasContainer.innerHTML = '';
        clientesContasContainer.innerHTML = '';

        bancoContainer.innerHTML = `<h3 class="mb-3">Banco: ${jsBanco.nome}</h3>`;
        agenciasContainer.innerHTML = `<h4>Agências Cadastradas</h4>`;
        
        if (jsBanco.agencias.length === 0) {
            agenciasContainer.innerHTML += '<p>Nenhuma agência cadastrada.</p>';
        } else {
            jsBanco.agencias.forEach(ag => {
                agenciasContainer.innerHTML += `
                    <div class="lista-item">
                        <strong>${ag.nomeCompleto}</strong><br>Clientes: ${ag.clientes.length}<br>Contas: ${ag.contas.length}
                    </div>`;
            });
        }
        
        clientesContasContainer.innerHTML = `<h4>Clientes e Contas</h4>`;
        jsBanco.agencias.forEach(ag => {
            clientesContasContainer.innerHTML += `<h5>Agência: ${ag.nomeCompleto}</h5>`;
            if (ag.clientes.length === 0) {
                clientesContasContainer.innerHTML += '<p class="text-muted ms-3">Nenhum cliente nesta agência.</p>';
            } else {
                ag.clientes.forEach(cliente => {
                    const conta = cliente.conta;
                    if (!conta) return; 
                    clientesContasContainer.innerHTML += `
                        <div class="lista-item ms-3">
                            <strong>Cliente: ${cliente.nome}</strong> (CPF: ${cliente.cpf})
                            <br>Conta N°: ${conta.numero}
                            <br>Saldo: ${conta.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>`;
                });
            }
        });
    }

   
    atualizarSelectAgencias();
    atualizarListagem();

    // SELETORES
    const formDeposito = document.getElementById('form-deposito');
    const formSaque = document.getElementById('form-saque');
    const formTransferir = document.getElementById('form-transferir');
    const btnExtrato = document.getElementById('btn-extrato');
    const btnVerEstrutura = document.getElementById('btn-ver-estrutura');
    const btnVerLogBC = document.getElementById('btn-ver-logbc');
    const formAgencia = document.getElementById('form-agencia');
    const formCadastro = document.getElementById('form-cadastro');
    const btnAtualizarListas = document.getElementById('btn-atualizar-listas');
    const abaListagem = document.getElementById('listagem-tab');
    const abaCadastros = document.getElementById('cadastros-tab');

    // OUVINTES

    formAgencia.addEventListener('submit', (event) => {
        event.preventDefault();
        const nome = document.getElementById('agencia-nome').value;
        
        if (!nome) {
            Swal.fire('Erro', 'Digite um nome para a agência.', 'error');
            return;
        }

        try {
            const novaAg = new Agencia(nome, jsBanco);
            Swal.fire('Sucesso', `Agência "${novaAg.nomeCompleto}" criada!`, 'success');
            formAgencia.reset();

            salvarDados(); // SALVA APÓS CRIAR
            atualizarSelectAgencias();
            atualizarListagem();

        } catch (e) {
            Swal.fire('Erro', e.message, 'error');
        }
    });

    formCadastro.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const nome = document.getElementById('cadastro-nome').value;
        const cpf = document.getElementById('cadastro-cpf').value;
        const agenciaIndex = document.getElementById('cadastro-agencia').value;

        if (!nome || !cpf || agenciaIndex === "") {
            Swal.fire('Erro', 'Preencha todos os campos.', 'error');
            return;
        }
        const agenciaObj = jsBanco.agencias[parseInt(agenciaIndex)];

        try {
            const novoCliente = new Cliente(nome, cpf, agenciaObj);
            const novaConta = new Conta(novoCliente, agenciaObj);
            Swal.fire({ title: 'Sucesso!', text: `Cliente ${novoCliente.nome} cadastrado na Conta ${novaConta.numero}!`, icon: 'success' });
            
            salvarDados(); // SALVA APÓS CRIAR
            atualizarListagem(); 
            formCadastro.reset();
        } catch (e) {
            Swal.fire('Erro no Cadastro', e.message, 'error');
        }
    });

    if(abaListagem) abaListagem.addEventListener('shown.bs.tab', atualizarListagem);
    if(abaCadastros) abaCadastros.addEventListener('shown.bs.tab', atualizarSelectAgencias);
    btnAtualizarListas.addEventListener('click', atualizarListagem);

    // Operações (Todas agora chamam salvarDados() no sucesso)
    formDeposito.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const contaNum = parseInt(document.getElementById('deposito-conta').value);
        const valorNum = parseFloat(document.getElementById('deposito-valor').value);
        const res = jsBanco.depositar(contaNum, valorNum); 
        if(res) { 
            salvarDados(); // SALVA
            Swal.fire('Sucesso', `Depósito de R$ ${valorNum} realizado!`, 'success'); 
            formDeposito.reset(); 
        } else Swal.fire('Erro', 'Falha no depósito.', 'error');
    });

    formSaque.addEventListener('submit', (event) => {
        event.preventDefault();
        const contaNum = parseInt(document.getElementById('saque-conta').value);
        const valorNum = parseFloat(document.getElementById('saque-valor').value);
        const res = jsBanco.sacar(contaNum, valorNum);
        if(res) { 
            salvarDados(); // SALVA
            Swal.fire('Sucesso', `Saque de R$ ${valorNum} realizado!`, 'success'); 
            formSaque.reset(); 
        } else Swal.fire('Erro', 'Saldo insuficiente ou conta inválida.', 'error');
    });

    formTransferir.addEventListener('submit', (event) => {
        event.preventDefault();
        const origemNum = parseInt(document.getElementById('transf-origem').value);
        const destinoNum = parseInt(document.getElementById('transf-destino').value);
        const valorNum = parseFloat(document.getElementById('transf-valor').value);
        const res = jsBanco.transferir(origemNum, destinoNum, valorNum);
        if(res) { 
            salvarDados(); // SALVA
            Swal.fire('Sucesso', 'Transferência realizada!', 'success'); 
            formTransferir.reset(); 
        } else Swal.fire('Erro', 'Falha na transferência.', 'error');
    });

    btnExtrato.addEventListener('click', () => {
        const contaNum = parseInt(document.getElementById('extrato-conta').value);
        if (isNaN(contaNum)) return;
        const res = jsBanco.consultarExtrato(contaNum);
        if(!res) Swal.fire('Erro', 'Conta não encontrada.', 'error');
        else Swal.fire({title: 'Extrato Gerado', text: 'Verifique o terminal.', icon: 'info', timer: 2000, showConfirmButton: false});
    });

    btnVerEstrutura.addEventListener('click', () => jsBanco.visualizarEstrutura());
    btnVerLogBC.addEventListener('click', () => jsBanco.verLogBC());

});