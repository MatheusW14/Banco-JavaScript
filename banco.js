class Agencia{
    nome;
    banco; // Referência ao banco
    #clientes = [];
    #contas = [];

    constructor(nome, banco){
        this.nome = nome;
        this.banco = banco; // Guarda qual e o banco
        banco.novaAgencia = this; // Se registra no banco
    }

    set novoCliente(cliente){
        this.#clientes.push(cliente);
    }

    set novaConta(conta){
        this.#contas.push(conta);
    }

    buscarConta(numeroConta){
        return this.#contas.find(c => c.numero === numeroConta);
    }

    get clientes(){
        return this.#clientes;
    }

    get contas(){
        return this.#contas;
    }
}
class Banco{
    nome;
    #agencias = [];
    #logBC = []; // Log para transações maiores que R$1000
    #proximoNumeroConta = 1;

    constructor(nome){
        this.nome = nome;
        console.log(`Banco ${this.nome} criado com sucesso!`);
    }

    set novaAgencia(agencia){
        this.#agencias.push(agencia);
        console.log(`[Banco ${this.nome}]: Agência ${agencia.nome} registrada.`);
    }

    get proximoNumeroConta(){
        return this.#proximoNumeroConta++;
    }

    _registrarBC(tipo, valor, contaOrigen, contaDestino = null){
        if (valor > 1000){
            const log = {
                tipo,
                valor: valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                contaOrigen: contaOrigen.numero,
                data: new Date().toLocaleString('pt-BR')
            };
            if (contaDestino){
                log.contaDestino = contaDestino.numero;
            }
            this.#logBC.push(log);
            console.warn(`[ALERTA BC]: ${tipo} de ${log.valor} da conta ${log.contaOrigen} registrado.`);
        }
    }

    buscarConta(numeroConta){
        let contaEncontrada = null;
        for (const agencia of this.#agencias){
            contaEncontrada = agencia.buscarConta(numeroConta);
            if (contaEncontrada){
                break;
            }   
        }
        if (!contaEncontrada) {
            console.error(`Conta número ${numeroConta} não encontrada em nenhuma agência.`);
        }
        return contaEncontrada;
    }

    depositar(numeroConta, valor){
        const conta = this.buscarConta(numeroConta);
        if (!conta) return;
        if (valor <= 0){
            console.error("Erro: Valor do saque deve ser positivo.");
            return;
        }
        conta.executarDeposito(valor);
    }

    sacar(numeroConta, valor){
        const conta = this.buscarConta(numeroConta);
        if (!conta) return;
        if (valor <= 0){
            console.error("Erro: Valor do saque deve ser positivo.");
            return;
        }
        conta.executarSaque(valor, false);
    }    

    transferir(numContaOrigen, numContaDestino, valor){
        const contaOrigen = this.buscarConta(numContaOrigen);
        const contaDestino = this.buscarConta(numContaDestino);

        if (!contaOrigen || !contaDestino) return;
        if (valor <= 0){
            console.error("Erro: Valor da transferência deve ser positivo.");
            return;
        }
        
        const sucessoSaque = contaOrigen.executarSaque(valor, true); // true = é uma transferência

        if (sucessoSaque){
            contaDestino.executarDeposito(valor, true); // true = é uma transferência
            console.log(`Transferência de R$${valor} da conta ${numContaOrigen} para ${numContaDestino} realizada.`);

            this._registrarBC('Transferência', valor, contaOrigen, contaDestino);
        }   
    }

    consultarExtrato(numeroConta){
        const conta = this.buscarConta(numeroConta);
        if (conta){
            conta.gerarExtrato();
        }
    }

    verLogBC(){
        console.log("\n--- LOG BANCO CENTRAL (Movimentações maiores que R$ 1000) ---");
        if (this.#logBC.length === 0){
            console.log("Nenhuma movimentação de alto valor registrada.");
        } else {
            console.table(this.#logBC);
        }
        console.log("---------------------------------------------------------\n");
    }

    visualizarEstrutura(){
        console.log(`\n--- ESTRUTURA DO BANCO ${this.nome} ---`);
        for (const agencia of this.#agencias){
            console.log(`Agência: ${agencia.nome}`);
            const clientes = agencia.clientes.map(c => c.nome);
            console.log(`Clientes: ${clientes.length > 0 ? clientes.join(', ') : 'Nenhum'}`);
            const contas = agencia.contas.map(c => c.numero);
            console.log(`Contas: ${contas.length > 0 ? contas.join(', ') : 'Nenhum'}`);
        }
        console.log("---------------------------------------\n");
    }
}   

class Cliente{
    nome;
    cpf;
    agencia;
    #conta = null;

    constructor(nome, cpf, agencia){
        this.nome = nome;
        this.cpf = cpf;
        this.agencia = agencia;
        agencia.novoCliente = this; // Se registra na agência
    }

    set conta(contaInstance){
        this.#conta = contaInstance;
    }

    get conta(){
        return this.#conta;
    }
}

class Conta{
    agencia;
    banco;
    numero;
    cliente;
    #saldo = 0;
    #transacoes = []; // Histórico de transações da pessoa

    constructor(cliente, agencia){
        this.cliente = cliente;
        this.agencia = agencia;
        this.banco = agencia.banco;

        // Pega o próximo número de conta do banco
        this.numero = this.banco.proximoNumeroConta;

        // Vincula esta conta ao cliente
        this.cliente.conta = this;

        // Registra-se na agencia
        agencia.novaConta = this;

        console.log(`[Agência ${this.agencia.nome}]: Conta ${this.numero} criada para ${this.cliente.nome}.`);
    }

    // Getter para o saldo (privado)
    get saldo(){
        return this.#saldo;
    }

    #adicionarTransacao(descricao, valor){
        const data = new Date().toLocaleString('pt-BR');
        this.#transacoes.push({data, descricao, valor });
    }

    executarDeposito(valor, ehTransferencia = false){
        this.#saldo += valor;

        const descricao = ehTransferencia ? `Valor Recebido` : "Depósito";
        this.#adicionarTransacao(descricao, valor);

        if (!ehTransferencia){
            console.log(`Depósito de R$${valor} realizado na conta ${this.numero}. Saldo: R$${this.#saldo}`);
            // Registra no BC (apenas se for depósito, senão a transferência registra)
            this.banco._registrarBC("Depósito", valor, this);
        }
    }

    executarSaque(valor, ehTransferencia = false){
        if (valor > this.#saldo) {
          console.error(`Erro: Saldo insuficiente na conta ${this.numero} (Saldo: R$${this.#saldo}).`);
          return false; 
        }
        
        this.#saldo -= valor;
        
        const descricao = ehTransferencia ? `Valor Enviado` : "Saque";
        this.#adicionarTransacao(descricao, -valor); // Valor negativo no extrato
    
        if (!ehTransferencia) {
            console.log(`Saque de R$${valor} realizado na conta ${this.numero}. Saldo: R$${this.#saldo}`);
            // Usa sua referência ao banco para registrar no BC
            this.banco._registrarBC("Saque", valor, this);
        }
        return true; 
    }

    gerarExtrato(){
        console.log(`\n--- EXTRATO: ${this.cliente.nome} ---`);
        console.log(`Agência: ${this.agencia.nome} | Conta: ${this.numero}`);
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


/*
 * =================================================================
 * 🚀 INÍCIO DA SIMULAÇÃO
 * =================================================================
 */
console.log("--- INICIANDO SIMULAÇÃO BANCÁRIA ---");

// -----------------------------------------------------------------
console.log("\n===== ETAPA 1: CONFIGURAÇÃO DO BANCO =====");
// -----------------------------------------------------------------
const jsBanco = new Banco("JS Bank");
const agCentro = new Agencia("001 - Centro", jsBanco);
const agBairro = new Agencia("002 - Bairro", jsBanco);

// -----------------------------------------------------------------
console.log("\n===== ETAPA 2: REGISTRO DE CLIENTES E CONTAS =====");
// -----------------------------------------------------------------
const alice = new Cliente("Alice Silva", "111.111.111-11", agCentro);
const beto = new Cliente("Beto Souza", "222.222.222-22", agBairro);
const carlos = new Cliente("Carlos Dias", "333.333.333-33", agCentro);

// As contas são criadas e logadas no console automaticamente
const contaAlice = new Conta(alice, agCentro); // Conta 1
const contaBeto = new Conta(beto, agBairro); // Conta 2
const contaCarlos = new Conta(carlos, agCentro); // Conta 3

// -----------------------------------------------------------------
// 5. VISUALIZAR A ESTRUTURA INICIAL
// -----------------------------------------------------------------
// (Este método já imprime seu próprio título)
jsBanco.visualizarEstrutura();

// -----------------------------------------------------------------
console.log("\n===== ETAPA 3: EXECUÇÃO DE TRANSAÇÕES =====");
// -----------------------------------------------------------------
console.log("--- (Iniciando depósitos...) ---");
jsBanco.depositar(1, 500);    // Alice (Conta 1)
jsBanco.depositar(2, 2500);   // Beto (Conta 2) (Aciona o BC)
jsBanco.depositar(3, 700);    // Carlos (Conta 3)

console.log("\n--- (Iniciando saques...) ---");
jsBanco.sacar(1, 100);       // Alice (Conta 1)

console.log("\n--- (Iniciando transferências...) ---");
jsBanco.transferir(2, 1, 1500); // Beto (2) -> Alice (1) (Aciona o BC)

console.log("\n--- (Testando saque com saldo insuficiente...) ---");
jsBanco.sacar(1, 5000); // Alice (1)

// -----------------------------------------------------------------
console.log("\n===== ETAPA 4: GERAÇÃO DE RELATÓRIOS =====");
// -----------------------------------------------------------------
console.log("--- (Gerando extratos individuais...) ---");
jsBanco.consultarExtrato(1); // Extrato de Alice
jsBanco.consultarExtrato(2); // Extrato de Beto
jsBanco.consultarExtrato(3); // Extrato de Carlos

// (Este método já imprime seu próprio título)
jsBanco.verLogBC();

console.log("--- FIM DA SIMULAÇÃO ---");