import express from 'express';
import { buscarCEP } from './acbr-cep';

const app = express();

app.get('/cep/:cep', async (req, res) => {
  try {
    const result = await buscarCEP(req.params.cep);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});