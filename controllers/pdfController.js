const path = require('path');
const fs = require('fs');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');
const PDFKitDocument = require('pdfkit');
const { Buffer } = require('buffer');
const db = require('../db');


async function makePdfDocument(boletos) {
    return new Promise((resolve, reject) => {
        const doc = new PDFKitDocument({ margin: 30 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            const base64 = pdfData.toString('base64');
            resolve(base64);
        });

        doc.fontSize(12).text('Relatório de Boletos', { align: 'center' });
        let y = doc.y + 20;

        const headers = ['ID', 'Nome Sacado', 'ID Lote', 'Valor', 'Linha Digitável', 'Ativo', 'Criado Em'];
        const colWidths = [35, 130, 50, 50, 120, 40, 110];

        y = drawRow(doc, headers, colWidths, y, true);

        boletos.forEach(boleto => {
            const row = [
                boleto.id,
                boleto.nome_sacado,
                boleto.id_lote || '',
                Number(boleto.valor).toFixed(2),
                boleto.linha_digitavel,
                boleto.ativo ? 'Sim' : 'Não',
                new Date(boleto.criado_em).toLocaleString('pt-BR')
            ];
            y = drawRow(doc, row, colWidths, y);
        });


        doc.end();
    });
}

function drawRow(doc, row, colWidths, startY, isHeader = false) {
    const startX = doc.page.margins.left;
    let x = startX;
    const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';

    doc.font(font).fontSize(10);

    row.forEach((text, i) => {
        doc.text(String(text), x, startY, {
            width: colWidths[i],
            align: 'left'
        });
        x += colWidths[i];
    });

    return startY + 20;
}


async function showPdfList(req, res) {
    const { nome, valor_inicial, valor_final, id_lote, relatorio } = req.query;

    const valores = [];
    const condicoes = [];

    if (nome) {
        valores.push(`%${nome}%`);
        condicoes.push(`nome_sacado ILIKE $${valores.length}`);
    }

    if (valor_inicial) {
        valores.push(Number(valor_inicial));
        condicoes.push(`valor >= $${valores.length}`);
    }

    if (valor_final) {
        valores.push(Number(valor_final));
        condicoes.push(`valor <= $${valores.length}`);
    }

    if (id_lote) {
        valores.push(Number(id_lote));
        condicoes.push(`id_lote = $${valores.length}`);
    }

    const where = condicoes.length > 0 ? 'WHERE ' + condicoes.join(' AND ') : '';

    try {
        const resultado = await db.query(`SELECT * FROM boletos ${where} ORDER BY id`, valores);
        const boletos = resultado.rows;


        if (relatorio == 1) {
            const base64PDF = await makePdfDocument(boletos);
            return res.json({ base64: base64PDF });
        }

        return res.json(boletos);
    } catch (err) {
        console.error('Erro ao buscar boletos:', err);
        return res.status(500).json({ erro: 'Erro ao buscar boletos' });
    }
}



async function splitPdf(req, res) {
    try {
        const pdfPath = req.file.path;

        const ordemPdf = [
            'MARCIA CARVALHO',
            'JOSE DA SILVA',
            'MARCOS ROBERTO'
        ];

        const result = await db.query(
            'SELECT id, nome_sacado FROM boletos WHERE nome_sacado = ANY($1)',
            [ordemPdf]
        );

        const boletosOrdenados = ordemPdf.map(nome =>
            result.rows.find(b => b.nome_sacado === nome)
        );

        await splitPdfByPage(pdfPath, boletosOrdenados);

        res.status(200).json({ message: 'PDFs divididos com sucesso!' });
    } catch (error) {
        console.error('Erro ao dividir PDF:', error);
        res.status(500).json({ error: 'Erro ao dividir PDF' });
    }
}

async function splitPdfByPage(pdfPath, boletosOrdenados) {
    const data = await fs.promises.readFile(pdfPath);
    const pdfDoc = await PDFLibDocument.load(data);

    for (let i = 0; i < boletosOrdenados.length; i++) {
        const boleto = boletosOrdenados[i];
        if (!boleto) continue;

        const novoPDF = await PDFLibDocument.create();
        const [pagina] = await novoPDF.copyPages(pdfDoc, [i]);
        novoPDF.addPage(pagina);

        const pdfBytes = await novoPDF.save();
        const outputPath = path.join(__dirname, '..', 'pdfs', `${boleto.id}.pdf`);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, pdfBytes);
        console.log(`Arquivo gerado: ${outputPath}`);
    }
}

module.exports = {
    splitPdf,
    showPdfList
};
