document.addEventListener('DOMContentLoaded', () => {

  // ===============================
  // BOTÕES NPS
  // ===============================
  const cont = document.getElementById('indicacaoBotoes');
  const inp  = document.getElementById('inputIndicacao');

  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i;
    btn.classList.add(i <= 4 ? 'vermelho' : i <= 7 ? 'amarelo' : 'verde');

    btn.addEventListener('click', () => {
      cont.querySelectorAll('button').forEach(b => b.classList.remove('selecionado'));
      btn.classList.add('selecionado');
      inp.value = i;
    });

    cont.appendChild(btn);
  }

  // ===============================
  // ESTRELAS
  // ===============================
  document.querySelectorAll('.estrelas').forEach(rating => {
    const inputs = Array.from(rating.querySelectorAll('input'));
    const labels = Array.from(rating.querySelectorAll('label'));

    function paint(idx) {
      labels.forEach((lbl, i) => {
        lbl.classList.toggle('filled', i <= idx);
      });
    }

    labels.forEach((lbl, idx) => {
      lbl.addEventListener('click', () => {
        inputs[idx].checked = true;
        paint(idx);
      });

      lbl.addEventListener('mouseover', () => paint(idx));
    });

    rating.addEventListener('mouseleave', () => {
      const checkedIdx = inputs.findIndex(i => i.checked);
      paint(checkedIdx);
    });
  });

  // ===============================
  // ENVIO PARA SUPABASE (banco novo do Tanon)
  // ===============================
  const form = document.getElementById("formularioPesquisa");

  // IDs fixos da empresa Smash do Cabo e da pesquisa "salão" no Tanon.
  const EMPRESA_ID = "b2dd1bb9-f8a6-4c81-9315-9776887f845a";
  const PESQUISA_ID = "56400757-8e02-45c1-96f8-a69c2c007f28";

  // pergunta_id de cada campo, cadastrados no módulo NPS do Tanon.
  const PERGUNTA_ID = {
    indicacao: "904a6cf1-f5f3-4c6d-88f9-8b52f0b31ac8",
    morador: "ba9f18ae-459d-46a6-8f66-7be540644756",
    atendimento: "746d1609-8470-4733-8fb4-9008ff77837d",
    qualidade: "ab7a984c-b9fb-44d9-a7e3-68e3bb35e3fd",
    tempo: "b91ce7f0-97db-4967-8bba-95672019a519",
    variedade: "88a49aa9-63f7-49d0-954b-faf231273e9b",
    custobeneficio: "0a9f0500-d1e7-4e5e-a05d-26bac70006b4",
    origem: "6ef718f0-8cc1-44dc-a11f-882a58770e4e",
    sugestao: "dd4a0ac8-1c5f-493e-a555-1863dba8432c",
  };

  form.addEventListener("submit", async (e) => {

    e.preventDefault(); // 🔴 impede refresh

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const data = Object.fromEntries(new FormData(form));

    if (!data.indicacao) {
      alert("Selecione uma nota de 0 a 10.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";
      return;
    }

    // Converte data nascimento (dd/mm/aaaa -> aaaa-mm-dd)
    let dataNascimentoIso = null;
    if (data.data_nascimento) {
      const [d, m, y] = data.data_nascimento.split("/");
      if (d && m && y) dataNascimentoIso = `${y}-${m}-${d}`;
    }

    const valorMorador = (data.morador || "").includes("Sim") ? "Morador" : "Turista";

    const respostas = [
      { pergunta_id: PERGUNTA_ID.indicacao, valor: String(data.indicacao) },
      { pergunta_id: PERGUNTA_ID.morador, valor: valorMorador },
      { pergunta_id: PERGUNTA_ID.atendimento, valor: String(data.atendimento) },
      { pergunta_id: PERGUNTA_ID.qualidade, valor: String(data.qualidade) },
      { pergunta_id: PERGUNTA_ID.tempo, valor: String(data.tempo) },
      { pergunta_id: PERGUNTA_ID.variedade, valor: String(data.variedade) },
      { pergunta_id: PERGUNTA_ID.custobeneficio, valor: String(data.custobeneficio) },
      { pergunta_id: PERGUNTA_ID.origem, valor: data.origem },
    ];

    if (data.sugestao && data.sugestao.trim()) {
      respostas.push({ pergunta_id: PERGUNTA_ID.sugestao, valor: data.sugestao.trim() });
    }

    const payload = {
      p_empresa_id: EMPRESA_ID,
      p_pesquisa_id: PESQUISA_ID,
      p_nome: data.nome || null,
      p_telefone: data.telefone || null,
      p_email: data.email || null,
      p_data_nascimento: dataNascimentoIso,
      p_respostas: respostas,
    };

    const URL = "https://mpxykreqguvfbulwfhfh.supabase.co/rest/v1/rpc/criar_resposta_e_cupom";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weHlrcmVxZ3V2ZmJ1bHdmaGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTUwMjksImV4cCI6MjA5OTU3MTAyOX0.EXfw1sdbtqYznkN4JONDudyLL2RHbyokIK2yRbudQk8";

    try {

      const resp = await fetch(URL, {
        method: "POST",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        let errorMessage = "Erro inesperado.";
        try {
          const err = await resp.json();
          errorMessage = err.message || JSON.stringify(err);
        } catch {
          errorMessage = await resp.text();
        }

        if (errorMessage.includes("ja_respondeu_hoje")) {
          alert("Você já respondeu nossa pesquisa hoje 💛\nVolte amanhã para participar novamente!");
          submitBtn.disabled = false;
          submitBtn.textContent = "Enviar";
          return;
        }

        throw new Error(errorMessage);
      }

      const resultado = (await resp.json())[0];

      // Salva dados para a tela de obrigado
      localStorage.setItem("cliente_nome", data.nome);
      localStorage.setItem("cliente_email", data.email);
      localStorage.setItem("cliente_telefone", data.telefone);
      localStorage.setItem("cupom_codigo", resultado.codigo);
      localStorage.setItem("cupom_brinde", resultado.brinde);
      localStorage.setItem("cupom_valido_ate", resultado.valido_ate);

      // Redireciona
      window.location.href = "obrigado.html";

    } catch (error) {

      alert("Erro ao enviar: " + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";

    }

  });

});
