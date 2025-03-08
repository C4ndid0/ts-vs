import express from 'express';
import { acbrLib } from './acbr-cep';

const app = express();

app.get('/cep/:cep', async (req, res) => {
  const result = acbrLib.buscarPorCEP(req.params.cep);
  res.json(result);
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});