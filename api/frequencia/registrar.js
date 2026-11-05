// Função Serverless Vercel para emular o backend Spring Boot sem necessidade de Java
let registrosMemoria = [];

module.exports = (req, res) => {
    // Configurações de CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Listagem para o relatorio.html
    if (req.method === 'GET') {
        res.status(200).json(registrosMemoria);
        return;
    }

    // Registro de frequência via POST
    if (req.method === 'POST') {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                body = {};
            }
        }
        body = body || {};

        const nome = body.nome;
        const ra = body.ra;
        const cpf = body.cpf;

        registrosMemoria.push(body);

        let identificacao = "o aluno";
        if (nome && nome.trim()) {
            identificacao = nome.trim();
        } else if (ra && ra.trim()) {
            identificacao = "o aluno com R A " + ra.trim();
        } else if (cpf && cpf.trim()) {
            identificacao = "o aluno com CPF " + cpf.trim();
        }

        res.status(200).json({
            status: "sucesso",
            mensagemVoz: "Presença registrada com sucesso para " + identificacao
        });
        return;
    }

    res.status(405).json({ error: "Método não permitido" });
};
