import express, { Request, Response } from 'express';
import { buscarCEP } from './acbr-cep';

const app = express();
app.use(express.json());

app.get('/cep/:cep', async (req: Request, res: Response) => {
  try {
    const cep = req.params.cep;
    const resultado = await buscarCEP(cep);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
}
