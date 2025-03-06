import { buscarCEP } from '../acbr-cep';

describe('ACBr CEP Module', () => {
  it('should return CEP data for a valid CEP', async () => {
    const cep = '01001000';
    const result = await buscarCEP(cep);
    expect(typeof result).toBe('object');
  });

  it('should throw an error for an invalid CEP', async () => {
    const cep = 'invalid';
    await expect(buscarCEP(cep)).rejects.toThrow();
  });
});