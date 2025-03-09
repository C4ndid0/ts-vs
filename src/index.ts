import express from 'express';
import { acbrLib } from './acbr-cep';

const app = express();

app.get('/cep/:cep', async (req, res) => {
  try {
    const result = acbrLib.buscarPorCEP(req.params.cep);
    res.json(result);
  } catch (error) {
    console.error(`Erro na rota /cep/:cep: ${error}`);
    res.status(500).json({ success: false, error: { code: -999, message: `Erro interno: ${error}` } });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});