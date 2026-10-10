# Codemux

Ambiente de desenvolvimento no navegador, para computador e celular. Sem dependências npm.

```sh
./start.sh            # ou: node server.js   (porta 9000 por padrão; IDE_PORT altera; IDE_PASSWORD=... protege com senha)
```

## Como está organizado

**Codemux → Projetos → Projeto → Seção → Ferramenta**

- **Início** e **Projetos** (favoritos, arquivados, lixeira, busca; criar com modelo, importar pasta/GitHub/ZIP).
- Dentro de um projeto: **Visão geral**, **Trabalho** (Editor · Terminal · IA), **Arquivos**, **Tarefas**, **Git**, **Histórico**, **Portas** e **Configurações do projeto**.
- **Desktop:** menu lateral + painéis redimensionáveis (editor, terminal embaixo, IA à direita) e barra de status.
- **Celular:** uma ferramenta por vez, navegação inferior, menus em folhas (bottom sheet). O botão voltar do navegador funciona entre as seções.
- **Pesquisar e comandos:** `Ctrl+K` (ou `Ctrl+Shift+P`); `Ctrl+P` abre arquivos. No celular, o botão 🔍 do topo.
- **Interface clássica** (janelas flutuantes originais): Configurações › Interface, ou abra `/?ui=classic`.
- Temas Claro/Escuro/Sistema, modo Simples/Avançado, instalável como app (PWA, em `localhost` ou HTTPS).

## IA (DeepSeek)

Em Trabalho › IA (ou ⚙ em Configurações): cole a chave de https://platform.deepseek.com. A IA enxerga o projeto, o arquivo atual, a seleção, as tarefas abertas e as alterações do Git; cria/edita/move/exclui arquivos **somente dentro do projeto**.

- Tudo que a IA faz fica registrado: **Revisar** (diff), **Manter** ou **Desfazer** (total ou por arquivo; se você editou o arquivo depois, ele é preservado).
- Exclusões vão para a **lixeira** (recuperável). Modo cuidadoso opcional: aprovar cada alteração com diff antes de gravar.
- A IA não executa comandos e não mexe em `.git`; commit/push ficam no app Git.
- Chave só no servidor (`~/.termux-ide-ai.json`, permissão 600) ou `DEEPSEEK_API_KEY`. Modelo padrão `deepseek-flash` (ou `deepseek-v4-pro`).

## Onde ficam os dados

`~/.codemux/` (projetos, tarefas, histórico, lixeira, registro de alterações da IA). Nada é gravado dentro das pastas dos projetos.

## Código

`server.js` (HTTP, terminal, Git) · `ai.js` (agente) · `cm/` (projetos, tarefas, histórico, lixeira, busca, alterações da IA) · `public/js/` (componentes: `editor`, `files`, `terminal`, `git`, `ai`; interface nova: `shell`, `work`, `projects`, `tasks`, `history`, `settings`, `palette`…) · `public/css/`.
