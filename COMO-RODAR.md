# Corpus — como usar

## Duplo clique no ícone **Corpus** da área de trabalho.

É só isso. Não precisa de terminal.

O atalho liga o servidor sozinho (sem abrir janela nenhuma) e abre o sistema
no navegador. Na primeira vez leva uns 5 segundos.

---

## E se eu reiniciar o PC?

Nada muda. Duas coisas já sobem sozinhas:

- O **banco de dados** (serviço MySQL84, em modo automático)
- O **servidor do site** (atalho na pasta Inicializar do Windows)

Ou seja: ligou o PC, o sistema já está no ar. O ícone da área de trabalho só
abre o navegador no endereço certo.

---

## O endereço do sistema

```
http://localhost:3000
```

Se preferir, pode digitar isso direto no navegador em vez de usar o ícone.

---

## Se aparecer "Não foi possível falar com o servidor"

Duplo clique no ícone **Corpus** de novo e espere 10 segundos.

Se insistir, reinicie o computador — as duas peças voltam sozinhas.

---

## Onde fica cada coisa

```
TG - Copia/
├── Corpus/     as telas (HTML, CSS, JS)
├── api/        o servidor
├── banco/      o script SQL
└── Corpus - abrir.vbs      ← o que o ícone da área de trabalho executa
```

---

## O que já está pronto

| Requisito | Estado |
|---|---|
| RF 01 Cadastro | tela + servidor + banco |
| RF 02 Login | tela + servidor + banco |
| RF 03 Biblioteca | tela pronta (dados no próprio JS) |
| RF 04 Filtro por grupo | funcionando |
| RF 05 Vídeo de execução | funcionando (arquivos locais) |
| RF 06 Orientações técnicas | funcionando |
| RF 10 Registro de carga | servidor pronto, falta ligar na tela |
| RF 11 Histórico | servidor pronto, falta ligar na tela |

---

## Duas pendências conhecidas

**1. A Biblioteca não puxa do banco.** A tela mostra 4 informações que a tabela
`exercicio` não guarda (nível, equipamento, músculos secundários e dicas).
Ficou assim de propósito, para não alterar a Tabela 17 do seu dicionário de
dados. A tela funciona normalmente.

**2. O RF 05 usa vídeos locais, não YouTube.** Sua documentação fala em links
do YouTube. Cada exercício no `Corpus/biblioteca.js` tem um campo `youtubeId`
vazio — preenchendo com o ID do vídeo, o player troca sozinho.

---

## Para desfazer o início automático

Apague o atalho desta pasta (cole o caminho na barra do Explorador):

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
```
