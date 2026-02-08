let produtos = [];
let tamanhoSelecionado = {};

const urlPlanilha =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vROQzyqceWg7roZJAHbweyrRp0kNt-gImtd9VJsAyhIDPzzrhmseCiNcq8lRrw6CiKU8ynX88gKWDod/pub?output=csv";

const lista = document.getElementById("listaProdutos");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroTamanho = document.getElementById("filtroTamanho");


// =====================================
// 🧠 PARSER CSV PROFISSIONAL
// =====================================
function parseCSVLine(linha){

  if(!linha) return null;

  const colunas = linha.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

  if(!colunas || colunas.length < 5) return null;

  return {
    nome: (colunas[0] || "").replace(/^"|"$/g,"").trim(),
    categoria: (colunas[1] || "").trim(),

    preco: parseFloat(
      (colunas[2] || "")
      .replace(/[^0-9,.-]/g,"")
      .replace(",",".")
    ) || 0,

    tamanhos: (colunas[3] || "")
      .split("|")
      .map(t => Number(t.replace(",",".").trim()))
      .filter(t => !isNaN(t)),

    imagem: (colunas[4] || "").replace(/^"|"$/g,"").trim()
  };
}


// =====================================
// ⏳ LOADING SKELETON
// =====================================
function mostrarLoading(){

  lista.innerHTML = "";

  for(let i=0;i<6;i++){
    lista.innerHTML += `
      <div class="card loading">
        <div class="img-loading"></div>
        <div class="linha-loading"></div>
        <div class="linha-loading pequena"></div>
      </div>
    `;
  }
}


// =====================================
// 🔄 BUSCAR PLANILHA
// =====================================
mostrarLoading();

fetch(urlPlanilha)
  .then(res => res.text())
  .then(texto => {

    const linhas = texto.split("\n").slice(1);

    produtos = linhas
      .map(parseCSVLine)
      .filter(p => p && p.nome);

    // ⭐ ordenação automática por preço
    produtos.sort((a,b)=> a.preco - b.preco);

    renderizar(produtos);
  })
  .catch(err => {
    console.error("Erro ao carregar:", err);
  });


// =====================================
// 🎨 RENDERIZAR PRODUTOS
// =====================================
function renderizar(listaFiltrada){

  lista.innerHTML = "";

  listaFiltrada.forEach((p,index)=>{

    lista.innerHTML += `
      <div class="card">
        <img 
          src="${p.imagem}" 
          alt="${p.nome}"
          onerror="this.src='https://via.placeholder.com/300x300?text=Sem+Imagem'"
        >

        <h2>${p.nome}</h2>

        <p class="preco">
          R$ ${p.preco.toFixed(2).replace(".",",")}
        </p>

        <div class="tamanhos">
          ${p.tamanhos.map(t=>`
            <span 
              class="tag-tamanho"
              onclick="selecionarTamanho(${index},this,${t})">
              ${t}
            </span>
          `).join("")}
        </div>

        <button class="botao-whats" onclick="enviarWhats(${index})">
          Comprar pelo WhatsApp
        </button>
      </div>
    `;
  });
}


// =====================================
// 👟 TAMANHO
// =====================================
function selecionarTamanho(index,elemento,tamanho){

  const tags = elemento.parentElement.querySelectorAll(".tag-tamanho");
  tags.forEach(tag=>tag.classList.remove("ativo"));

  elemento.classList.add("ativo");
  tamanhoSelecionado[index] = tamanho;
}


// =====================================
// 🔎 FILTROS
// =====================================
function aplicarFiltros(){

  const cat = filtroCategoria.value;
  const tam = filtroTamanho.value;

  const filtrado = produtos.filter(p=>{

    const okCat = cat === "" || p.categoria === cat;

    const okTam =
      tam === "" ||
      p.tamanhos.includes(Number(tam));

    return okCat && okTam;
  });

  renderizar(filtrado);
}

filtroCategoria.addEventListener("change", aplicarFiltros);
filtroTamanho.addEventListener("change", aplicarFiltros);


// =====================================
// 📲 WHATSAPP
// =====================================
function enviarWhats(index){

  const produto = produtos[index];
  const tamanho = tamanhoSelecionado[index];

  if(!tamanho){
    alert("Selecione um tamanho antes 🙂");
    return;
  }

  const numero = "558189928688";

  const msg =
`Olá! Quero comprar:
Produto: ${produto.nome}
Tamanho: ${tamanho}`;

  window.open(
    `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
  );
}
const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
});

backToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});



