# Codemux
Programe na sua rede local no celular ou computador.

## IA (DeepSeek)

No app **Código**, o botão ✨ abre um assistente que cria, edita, renomeia/move e exclui arquivos na pasta aberta no editor.

1. No Código, abra a pasta do projeto (a IA só trabalha dentro dela, nunca na pasta Início).
2. Toque em ✨ → ⚙ e cole sua chave de https://platform.deepseek.com.
3. Peça, por exemplo: "crie uma API Express com rotas de usuário".

- **Excluir sempre pede confirmação** (dá para desligar em ⚙).
- A IA não tem terminal e não mexe em `.git`; commit e push continuam no app **Git**, que atualiza sozinho com o que a IA fizer.
- A chave fica só no servidor (`~/.termux-ide-ai.json`, permissão 600). Alternativas: variável `DEEPSEEK_API_KEY`.
- Modelo padrão: `deepseek-flash` (ou `deepseek-v4-pro`). Variáveis opcionais: `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`.
- Requer Node 18+ (`pkg upgrade nodejs`). Continua sem dependências npm.

Arquivos da IA: `ai.js` (servidor), `public/ai.js` e `public/ai.css` (interface).
