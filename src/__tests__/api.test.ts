import request from 'supertest';
import app from '../index';

describe('CEP API', () => {
  it('should return CEP data for a valid CEP', async () => {
    const response = await request(app).get('/cep/01001000');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('Logradouro');
    expect(response.body).toHaveProperty('Bairro');
    expect(response.body).toHaveProperty('Municipio');
  });

  it('should return an error for an invalid CEP', async () => {
    const response = await request(app).get('/cep/invalid');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});