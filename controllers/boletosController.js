const parseCSV = require('../parser/csvParser');
const db = require('../db');
const fs = require('fs');


async function addLote(req, res) {
    const { nome, id } = req.body;

    if (!nome) {
        return res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
    }

    try {
        const existing = await db.query('SELECT id FROM lotes WHERE nome = $1', [nome]);

        if (existing.rowCount > 0) {
            return res.status(200).json({
                message: `Lote já existe.`,
                id: existing.rows[0].id
            });
        }

        // 1. Insere com id automático
        const insertResult = await db.query(
            'INSERT INTO lotes (nome, ativo, criado_em) VALUES ($1, true, NOW()) RETURNING id',
            [nome]
        );

        const insertedId = insertResult.rows[0].id;

        // 2. Atualiza o ID se for fornecido
        if (id) {
            await db.query('UPDATE lotes SET id = $1 WHERE id = $2', [id, insertedId]);
            return res.status(201).json({
                message: `Lote criado e ID alterado para ${id}`,
                id: id
            });
        }

        return res.status(201).json({
            message: 'Lote criado com sucesso!',
            id: insertedId
        });

    } catch (err) {
        console.error('Erro ao adicionar lote:', err.message);
        return res.status(500).json({ error: 'Erro ao adicionar lote.' });
    }
}


async function insertBoleto(boleto, idLote) {
    await db.query(
        'INSERT INTO boletos (nome_sacado, id_lote, valor, linha_digitavel, ativo, criado_em) VALUES ($1, $2, $3, $4, true, NOW())',
        [boleto.nome_sacado, idLote, boleto.valor, boleto.linha_digitavel]
    );
}

const loteCache = {};

async function getLoteByName(nomeUnidade) {
    const nomeFormatado = nomeUnidade.padStart(4, '0');

    if (loteCache[nomeFormatado]) return loteCache[nomeFormatado];

    const res = await db.query('SELECT id FROM lotes WHERE nome = $1', [nomeFormatado]);

    if (res.rowCount > 0) {
        const id = res.rows[0].id;
        loteCache[nomeFormatado] = id;
        return id;
    }

    throw new Error(`Lote com nome "${nomeFormatado}" não encontrado.`);
}


async function importCSV(req, res) {
    let filePath;

    try {
        filePath = req.file.path;
        const dados = await parseCSV(filePath);

        for (const dado of dados) {
            const idLote = await getLoteByName(dado.unidade);

            const boleto = {
                nome_sacado: dado.nome,
                valor: dado.valor,
                linha_digitavel: dado.linha_digitavel
            };

            await insertBoleto(boleto, idLote);
        }

        res.status(200).json({ message: 'CSV importado com sucesso!', quantidade: dados.length });
    } catch (error) {
        console.error('Erro ao importar CSV:', error.message);
        res.status(500).json({ error: 'Erro ao importar CSV' });
    } finally {
        if (filePath) {
            try {
                await fs.promises.unlink(filePath);
                console.log(`Arquivo ${filePath} deletado.`);
            } catch (err) {
                console.error(`Erro ao deletar arquivo ${filePath}:`, err.message);
            }
        }
    }
}

module.exports = {
    importCSV, addLote
};
