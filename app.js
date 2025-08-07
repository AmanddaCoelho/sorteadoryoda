// senha simples (altere para algo mais seguro se for expor)
// você pode mudar aqui, ou futuramente fazer puxar de um backend
const SENHA_CORRETA = "agencia123"; // <- mudar depois
const SESSION_KEY = "sorteador_recargas_autenticado";
const STORAGE_KEY = "sorteador_recargas_entries";

// === autenticação ===
function estaAutenticado() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function setAutenticado() {
  sessionStorage.setItem(SESSION_KEY, "1");
}

function bloquearAcesso() {
  document.getElementById("app").setAttribute("aria-hidden", "true");
  document.getElementById("login-overlay").style.display = "flex";
}

function liberarAcesso() {
  document.getElementById("app").removeAttribute("aria-hidden");
  document.getElementById("login-overlay").style.display = "none";
}

// login
document.getElementById("btn-login").addEventListener("click", () => {
  const tentativa = document.getElementById("senha-input").value;
  const erroEl = document.getElementById("erro-login");
  erroEl.style.display = "none";
  if (tentativa === SENHA_CORRETA) {
    setAutenticado();
    liberarAcesso();
    inicializaApp();
  } else {
    erroEl.textContent = "Senha incorreta."; 
    erroEl.style.display = "block";
  }
});

document.getElementById("senha-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("btn-login").click();
});

// === dados ===
function carregarEntradas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function salvarEntradas(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function qualifica(entry) {
  return entry.coins >= 20000;
}

function formatarDataISO(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString("pt-BR");
}

// tabela e contagem
function atualizarTabela() {
  const tbody = document.querySelector("#tabela tbody");
  tbody.innerHTML = "";
  const entradas = carregarEntradas();

  entradas.forEach((e, idx) => {
    const tr = document.createElement("tr");

    const tdData = document.createElement("td");
    tdData.textContent = formatarDataISO(e.data);
    tr.appendChild(tdData);

    const tdUser = document.createElement("td");
    tdUser.textContent = e.usuario;
    tr.appendChild(tdUser);

    const tdCoins = document.createElement("td");
    tdCoins.textContent = e.coins.toLocaleString("pt-BR");
    tr.appendChild(tdCoins);

    const tdQual = document.createElement("td");
    tdQual.textContent = qualifica(e) ? "Sim" : "Não";
    tdQual.style.fontWeight = "600";
    tr.appendChild(tdQual);

    const tdChances = document.createElement("td");
    tdChances.textContent = qualifica(e) ? Math.floor(e.coins / 20000) : "0";
    tr.appendChild(tdChances);

    const tdAcoes = document.createElement("td");
    const btnRemover = document.createElement("button");
    btnRemover.textContent = "Remover";
    btnRemover.className = "btn-secondary";
    btnRemover.style.padding = "4px 8px";
    btnRemover.addEventListener("click", () => {
      if (confirm("Remover esta entrada?")) {
        entradas.splice(idx, 1);
        salvarEntradas(entradas);
        atualizarTabela();
        atualizarContagem();
      }
    });
    tdAcoes.appendChild(btnRemover);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });

  atualizarContagem();
}

function filtrarEntradasPorData(entradas, de, ate) {
  return entradas.filter((e) => {
    const d = new Date(e.data);
    if (de && d < new Date(de)) return false;
    if (ate && d > new Date(ate)) return false;
    return true;
  });
}

function calcularChancesValidas(deFiltro, ateFiltro) {
  let entradas = carregarEntradas();
  entradas = filtrarEntradasPorData(entradas, deFiltro, ateFiltro);

  let chances = [];
  entradas.forEach((entry) => {
    if (qualifica(entry)) {
      const n = Math.floor(entry.coins / 20000);
      for (let i = 0; i < n; i++) {
        chances.push(entry);
      }
    }
  });

  return chances;
}

function atualizarContagem() {
  const deFiltro = document.getElementById("deFiltro").value;
  const ateFiltro = document.getElementById("ateFiltro").value;
  const validas = calcularChancesValidas(deFiltro, ateFiltro);
  document.getElementById("total-chances").textContent = validas.length;
}

// sorteio
let ganhadores = []; // Array para armazenar ganhadores

function sortearGanhador(lugar) {
  const deFiltro = document.getElementById("deFiltro").value;
  const ateFiltro = document.getElementById("ateFiltro").value;
  let validas = calcularChancesValidas(deFiltro, ateFiltro);

  // Evita sortear o mesmo usuário
  validas = validas.filter(entry => !ganhadores.includes(entry.usuario));

  if (validas.length === 0) {
    alert("Não há entradas válidas restantes (ou todos já foram sorteados).");
    return;
  }

  const indice = Math.floor(Math.random() * validas.length);
  const ganhador = validas[indice];

  ganhadores.push(ganhador.usuario); // salva apenas o ID do usuário

  const textoGanhador = `${ganhador.usuario} (compra em ${formatarDataISO(ganhador.data)})`;
  const ganhadorTextEl = document.getElementById("ganhador-text");

  const linha = document.createElement("div");
  linha.innerHTML = `<strong>${lugar}º Lugar:</strong> ${textoGanhador}`;
  ganhadorTextEl.appendChild(linha);

  document.getElementById("btn-copiar-ganhador").disabled = false;
  document.getElementById("btn-copiar-ganhador").dataset.ganhador = ganhador.usuario;
}

// Adicione botões
document.getElementById("btn-sorteio-1").addEventListener("click", () => sortearGanhador(1));
document.getElementById("btn-sorteio-2").addEventListener("click", () => sortearGanhador(2));
document.getElementById("btn-sorteio-3").addEventListener("click", () => sortearGanhador(3));

// copiar
function copiarGanhador() {
  const texto = document.getElementById("ganhador-text").innerText;
  if (!texto) return;
  navigator.clipboard.writeText(texto).then(() => {
    alert("Texto dos ganhadores copiado!");
  });
}

// exportar CSV
function exportarCSV(entradas) {
  if (!entradas.length) return;
    const header = ["data", "usuario", "coins"];
    const lines = entradas.map(e => {
  return [
    e.data,
    `"${e.usuario.replace(/"/g, '""')}"`,
    e.coins
  ].join(",");
});

  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `entradas_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// inicialização após login
function inicializaApp() {
  // preencher tabela
  atualizarTabela();

  // eventos de UI
  document.getElementById("btn-add").addEventListener("click", () => {
    const usuario = document.getElementById("usuario").value.trim();
    const coins = parseInt(document.getElementById("coins").value, 10);
    const data = document.getElementById("dataCompra").value;

    const erroEl = document.getElementById("erro-cadastro");
    erroEl.style.display = "none";
    erroEl.textContent = "";

    if (!usuario) {
      erroEl.textContent = "Informe o ID do usuário."; erroEl.style.display = "block"; return;
    }
    if (!data) {
      erroEl.textContent = "Informe a data da compra."; erroEl.style.display = "block"; return;
    }
    if (isNaN(coins) || coins <= 0) {
    erroEl.textContent = "Informe uma quantidade válida de coins."; erroEl.style.display = "block"; return;
    }

    if ((isNaN(coins) || coins < 20000)) {
      erroEl.textContent = "Não qualifica: precisa ter coins ≥ 20000. "; erroEl.style.display = "block"; return;
    }

    const entrada = {
      usuario,
      coins: isNaN(coins) ? 0 : coins,
      data
    };

    const entradas = carregarEntradas();
    entradas.push(entrada);
    salvarEntradas(entradas);
    atualizarTabela();

    document.getElementById("coins").value = "";
    document.getElementById("dataCompra").value = "";
  });

  document.getElementById("deFiltro").addEventListener("change", atualizarContagem);
  document.getElementById("ateFiltro").addEventListener("change", atualizarContagem);
  document.getElementById("btn-sorteio").addEventListener("click", () => sortearGanhador());
  document.getElementById("btn-copiar-ganhador").addEventListener("click", copiarGanhador);
  document.getElementById("btn-exportar-csv").addEventListener("click", () => {
    const todas = carregarEntradas();
    exportarCSV(todas);
  });
}
  document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
    document.getElementById('deFiltro').value = "";
    document.getElementById('ateFiltro').value = "";
    atualizarTabela();
    atualizarContagem();
  });
 // Função para limpar tudo (cadastros + sorteios)
document.getElementById('btn-limpar-tudo').addEventListener('click', function () {
  const confirmacao = confirm('Tem certeza que deseja apagar todos os dados? Isso não poderá ser desfeito.');

  if (!confirmacao) return;

  // Remove do localStorage
  localStorage.removeItem(STORAGE_KEY);

  // Zera variáveis
  ganhadores = [];

  // Limpa a tabela
  atualizarTabela();

  // Limpa o conteúdo da div de ganhadores
  const ganhadorTextEl = document.getElementById('ganhador-text');
  if (ganhadorTextEl) {
    ganhadorTextEl.innerHTML = '<p>Nenhum sorteio feito.</p>';
  }

  // Zera o total de chances
  const totalChancesEl = document.getElementById('total-chances');
  if (totalChancesEl) {
    totalChancesEl.textContent = '0';
  }

  // Desabilita botão de copiar
  const copiarBtn = document.getElementById('btn-copiar-ganhador');
  if (copiarBtn) {
    copiarBtn.disabled = true;
  }

  alert('Todos os dados foram apagados.');
});


// ao carregar: checa autenticação
window.addEventListener("DOMContentLoaded", () => {
  if (estaAutenticado()) {
    liberarAcesso();
    inicializaApp();
  } else {
    bloquearAcesso();
  }
});