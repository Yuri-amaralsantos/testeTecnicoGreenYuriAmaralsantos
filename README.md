# 📄 Projeto de Importação e Gerenciamento de Boletos
Este projeto é uma API em Node.js que permite:

Importar boletos a partir de arquivos CSV

Gerar relatórios em PDF com filtros

Dividir arquivos PDF com várias páginas em PDFs individuais

Gerenciar lotes de boletos

## 🛠️ Tecnologias Utilizadas
Node.js com Express

PostgreSQL (via pg)

pdf-lib e pdfkit para manipulação de PDF

csv-parser para leitura de arquivos CSV

Multer para upload de arquivos

## 📁 Estrutura do Projeto

├── controllers/
│   ├── boletosController.js
│   └── pdfController.js
├── parser/
│   └── csvParser.js
├── uploads/            # Arquivos temporários enviados
├── pdfs/               # PDFs gerados individualmente
├── routes.js           # Definições de rotas
├── db.js               # Conexão com banco PostgreSQL
└── README.md

## 🔄 Funcionalidades
📥 Importar CSV (/importarCsv)
Recebe um arquivo .csv com os campos nome, valor, linha_digitavel, unidade.

Para cada linha:
Procura o ID do lote baseado na unidade.
Insere o boleto no banco de dados.
Apaga o arquivo CSV após o processamento.

## 📤 Importar PDF (/importarPdf)
Recebe um PDF multi-páginas.

Divide o PDF em páginas individuais com base em uma ordem de nomes (ordemPdf).

Salva os arquivos em /pdfs/{id}.pdf, um para cada sacado correspondente no banco.

📄 Listar Boletos e Gerar Relatório (/boletos)
Filtros disponíveis via query params:
nome
valor_inicial
valor_final
id_lote
relatorio=1 → retorna um PDF base64 com o relatório

## 🧾 Criar Lote Manualmente (/Addlote)
Pode ser usada para criar lotes usando um número de 1 a 9999.


## 🧠 Observações Técnicas
A função parseCSV lê arquivos CSV de forma assíncrona com promessas.

O cache de lotes (loteCache) evita buscas repetidas no banco.

A criação dos PDFs usa pdfkit para gerar relatórios e pdf-lib para dividir arquivos existentes.

O banco de dados tem duas tabelas principais: boletos e lotes.

## ▶️ Rodando o Projeto
Instale as dependências:
npm install

Crie o banco de dados PostgreSQL com as tabelas boletos e lotes.

Inicie o servidor:
node index.js

Use ferramentas como Postman ou Insomnia para testar as rotas.

## Visualizando o arquivo json de Base 64 

https://www.base64decode.net/base64-to-pdf

Cole a resposta nesse site e clique decode pdf e depois em download para visualizaro pdf.
