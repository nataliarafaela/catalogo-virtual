// =====================================
// 📦 ESTADO GLOBAL
// =====================================
let produtos = [];
let variantes = [];
let selecionado = {}; 

const urlProdutos = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtesIfp9vMTQldlv6-EMbUcxbacxS1Bfeu63tsu03H-3pPXA4hKiiZcOzLxy5A1-ruv6pCIJdN_vGm/pub?gid=0&single=true&output=csv";
const urlVariantes = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtesIfp9vMTQldlv6-EMbUcxbacxS1Bfeu63tsu03H-3pPXA4hKiiZcOzLxy5A1-ruv6pCIJdN_vGm/pub?gid=1085531239&single=true&output=csv";

const lista = document.getElementById("listaProdutos");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroTamanho = document.getElementById("filtroTamanho");

filtroCategoria.addEventListener("change", filtrarProdutos);
filtroTamanho.addEventListener("change", filtrarProdutos);

const meuAppName = "Admin-719054069"; 
const minhaTabela = "Produtos";

function formatarLinkAppSheet(path) {
  if (!path) return null;
  path = path.trim().replace(/^"|"$/g, "").trim();
  if (!path) return null;
  if (path.startsWith('data:image') || path.startsWith('http')) return path;
  return `https://www.appsheet.com/template/gettablefileurl?appName=${encodeURIComponent(meuAppName)}&tableName=${encodeURIComponent(minhaTabela)}&fileName=${encodeURIComponent(path)}`;
}

// =====================================
// 🧠 PARSERS (CSV)
// =====================================
function parseProduto(linha){
  if(!linha) return null;
  const col = linha.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
  if(!col || col.length < 5) return null;
  let precoLimpo = (col[3]||"").replace(/^"|"$/g,"").trim().replace(",", ".");

  return {
    id: (col[0]||"").trim().replace(/^"|"$/g,""),
    nome: (col[1]||"").replace(/^"|"$/g,"").trim(),
    categoria: (col[2]||"").replace(/^"|"$/g,"").trim(),
    preco: parseFloat(precoLimpo) || 0,
    imagem: formatarLinkAppSheet(col[4]),
    imagens_extra: (col[5]||"").trim()
  };
}

function parseVariante(linha){
  if(!linha) return null;
  const col = linha.split(",");
  if(col.length < 5) return null;
  return {
    id_variante: col[0].trim(),
    id_produto: col[1].trim().replace(/^"|"$/g,""),
    tamanho: (col[2]||"").trim(),
    cor: (col[3]||"").trim(),
    estoque: Number(col[4]) || 0
  };
}

// =====================================
// 🔄 CARREGAR DADOS
// =====================================
Promise.all([
  fetch(urlProdutos).then(r=>r.text()),
  fetch(urlVariantes).then(r=>r.text())
]).then(([csvProdutos,csvVariantes])=>{
  produtos = csvProdutos.split("\n").slice(1).map(parseProduto).filter(p=>p && p.id);
  variantes = csvVariantes.split("\n").slice(1).map(parseVariante).filter(v=>v && v.id_produto);

  produtos.forEach(p=>{
    p.variantes = variantes.filter(v=>v.id_produto === p.id);
    p.temEstoque = p.variantes.reduce((s,v)=>s+v.estoque,0) > 0;
  });

  produtos = produtos.filter(p=>p.temEstoque).sort((a,b)=> a.preco - b.preco);
  renderizar(produtos);
});

function filtrarProdutos() {
  const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const catSelecionada = normalizar(filtroCategoria.value);
  const tamSelecionado = filtroTamanho.value;

  const produtosFiltrados = produtos.filter(p => {
    const categoriaProduto = normalizar(p.categoria || "");
    const bateCategoria = catSelecionada === "" || categoriaProduto.includes(catSelecionada);
    const bateTamanho = tamSelecionado === "" || p.variantes.some(v => v.tamanho == tamSelecionado && v.estoque > 0);
    return bateCategoria && bateTamanho;
  });
  renderizar(produtosFiltrados);
}

// =====================================
// 🖌️ RENDERIZAÇÃO
// =====================================
function renderizar(listaFiltrada){
  lista.innerHTML = "";
  if(listaFiltrada.length === 0) {
    lista.innerHTML = "<p class='col-span-full text-center py-10 text-gray-500'>Nenhum produto encontrado.</p>";
    return;
  }

  listaFiltrada.forEach((p)=>{
    const coresDisponiveis = [...new Set(p.variantes.filter(v=>v.estoque > 0).map(v=>v.cor))];

    lista.innerHTML += `
      <div class="card">
        <img src="${p.imagem}" onclick="abrirModal('${p.id}')" style="cursor:pointer">
        <h2>${p.nome}</h2>
        <p class="preco">R$ ${p.preco.toFixed(2).replace(".",",")}</p>
        
        <a href="javascript:void(0)" class="btn-ver-mobile" onclick="abrirModal('${p.id}')">Ver detalhes</a>

        <div class="secao-selecao">
          <small>Selecione a Cor:</small>
          <div class="tamanhos">
            ${coresDisponiveis.map(c=>`<span class="tag-tamanho" onclick="selecionarCor('${p.id}',this,'${c}')">${capitalizar(c)}</span>`).join("")}
          </div>
        </div>
        
        <div class="secao-selecao">
          <small>Tamanhos disponíveis:</small>
          <div class="tamanhos" id="tamanhos-opcoes-${p.id}">
            <span class="placeholder-tamanho">Escolha uma cor...</span>
          </div>
        </div>
        
        <button class="botao-whats" onclick="enviarWhats('${p.id}')">Comprar pelo WhatsApp</button>
      </div>
    `;
  });
}

// =====================================
// ⚡ LÓGICA DE SELEÇÃO (CARD & MODAL)
// =====================================

// Seleção no CARD (Desktop)
function selecionarCor(id, el, cor) {
    selecionado = {}; // Reset global
    document.querySelectorAll(".tag-tamanho").forEach(t => t.classList.remove("ativo"));
    document.querySelectorAll(".tamanhos[id^='tamanhos-opcoes-']").forEach(c => {
        if (c.id !== `tamanhos-opcoes-${id}`) c.innerHTML = '<span class="placeholder-tamanho">Escolha uma cor...</span>';
    });

    el.classList.add("ativo");
    selecionado[id] = { cor: cor };

    const p = produtos.find(prod => prod.id === id);
    const tams = p.variantes.filter(v => v.cor.toLowerCase() === cor.toLowerCase() && v.estoque > 0).sort((a,b)=>a.tamanho - b.tamanho);

    const container = document.getElementById(`tamanhos-opcoes-${id}`);
    container.innerHTML = tams.map(v => `<span class="tag-tamanho" onclick="selecionarTamanho('${id}', this, '${v.tamanho}')">${v.tamanho}</span>`).join("");
}

function selecionarTamanho(id, el, tam){ 
  el.parentElement.querySelectorAll(".tag-tamanho").forEach(x=>x.classList.remove("ativo"));
  el.classList.add("ativo"); 
  selecionado[id].tamanho = tam; 
}

// Seleção DENTRO do Modal
function selecionarCorModal(id, el, cor) {
    el.parentElement.querySelectorAll(".tag-tamanho").forEach(t => t.classList.remove("ativo"));
    el.classList.add("ativo");
    
    selecionado[id] = { cor: cor };

    const p = produtos.find(prod => prod.id === id);
    const tams = p.variantes.filter(v => v.cor.toLowerCase() === cor.toLowerCase() && v.estoque > 0).sort((a,b)=>a.tamanho - b.tamanho);

    const container = document.getElementById("modalTamanhos");
    container.innerHTML = tams.map(v => `<span class="tag-tamanho" onclick="selecionarTamanhoModal('${id}', this, '${v.tamanho}')">${v.tamanho}</span>`).join("");
}

function selecionarTamanhoModal(id, el, tam) {
    el.parentElement.querySelectorAll(".tag-tamanho").forEach(x => x.classList.remove("ativo"));
    el.classList.add("ativo");
    selecionado[id].tamanho = tam;
}

// =====================================
// 🖼️ MODAL E WHATSAPP
// =====================================
function abrirModal(idProduto){
  const p = produtos.find(prod => prod.id === idProduto);
  if(!p) return;

  selecionado = {}; // Reset ao abrir
  const modal = document.getElementById("modalProduto");
  
  document.getElementById("modalNome").innerText = p.nome;
  document.getElementById("modalPreco").innerText = "R$ " + p.preco.toFixed(2).replace(".",",");

  // Imagens
  const imgPrincipal = document.getElementById("modalImagemPrincipal");
  const miniaturas = document.getElementById("modalMiniaturas");
  let imagens = [p.imagem];
  if(p.imagens_extra){
    const extras = p.imagens_extra.replace(/^"|"$/g, "").split("|").map(i=>i.trim()).filter(i=>i);
    extras.forEach(img => imagens.push(formatarLinkAppSheet(img)));
  }
  imgPrincipal.src = imagens[0];
  miniaturas.innerHTML = imagens.map(img => `<img src="${img}" onclick="trocarImagem('${img}')" class="mini-modal">`).join("");

  // Cores no Modal
  const containerCores = document.getElementById("modalCores");
  const coresU = [...new Set(p.variantes.filter(v=>v.estoque > 0).map(v=>v.cor))];
  containerCores.innerHTML = coresU.map(c => `<span class="tag-tamanho" onclick="selecionarCorModal('${p.id}', this, '${c}')">${capitalizar(c)}</span>`).join("");

  // Reset Tamanhos no Modal
  document.getElementById("modalTamanhos").innerHTML = '<span class="text-gray-400 text-sm italic">Selecione uma cor primeiro...</span>';

  // Botão Whats no Modal
  document.getElementById("btnComprarModal").onclick = () => enviarWhats(p.id);

  modal.classList.replace("hidden", "flex");
}

function trocarImagem(src){ document.getElementById("modalImagemPrincipal").src = src; }
function fecharModal(){ document.getElementById("modalProduto").classList.replace("flex", "hidden"); }

function enviarWhats(id){
  const p = produtos.find(prod => prod.id === id);
  const sel = selecionado[id];
  
  if(!sel || !sel.cor || !sel.tamanho){ 
    alert("Por favor, selecione primeiro a Cor e depois o Tamanho! 😊"); 
    return; 
  }
  
  const msg = `Olá! Vi no catálogo e gostaria de comprar:\n\n*Produto:* ${p.nome}\n*Cor:* ${capitalizar(sel.cor)}\n*Tamanho:* ${sel.tamanho}\n*Preço:* R$ ${p.preco.toFixed(2).replace(".",",")}`;
  window.open(`https://wa.me/558189928688?text=${encodeURIComponent(msg)}`);
}

function capitalizar(t){ return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ""; }
