import { define, open, DataType } from 'ffi-rs';
import * as path from 'path';

// Define o caminho da biblioteca com base no sistema operacional
const libPath = process.platform === 'win32'
  ? path.join(__dirname, '../lib/windows/ACBrCEP64.dll') // Windows
  : path.join(__dirname, '../lib/linux/libacbrcep64.so'); // Linux

// Abre a biblioteca nativa com um nome fixo e o caminho específico
open({ library: 'ACBrCEP', path: libPath });

// Interface que define as funções da biblioteca ACBrCEP
interface ACBrLib {
  CEP_Inicializar: (params: [string, string]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_Finalizar: () => { errnoCode: number; errnoMessage: string; value: number };
  CEP_BuscarPorCEP: (params: [string, Buffer, Buffer]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_UltimoRetorno: (params: [Buffer, number]) => { errnoCode: number; errnoMessage: string; value: number };
}

// Configura as funções da biblioteca usando ffi-rs
const lib = define({
  CEP_Inicializar: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [DataType.String, DataType.String], errno: true },
  CEP_Finalizar: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [], errno: true },
  CEP_BuscarPorCEP: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [DataType.String, DataType.U8Array, DataType.U8Array], errno: true },
  CEP_UltimoRetorno: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [DataType.U8Array, DataType.I32], errno: true },
}) as unknown as ACBrLib;

// Função principal para buscar informações de um CEP
export async function buscarCEP(cep: string): Promise<any> {
  const buflength = 16384; // Tamanho do buffer para a resposta
  const sResposta = Buffer.alloc(buflength); // Buffer para armazenar a resposta da biblioteca
  const esTamanho = Buffer.alloc(buflength); // Buffer para o tamanho da resposta (mutável)
  esTamanho.writeInt32LE(buflength, 0); // Inicializa com o tamanho máximo

  // Define o caminho do arquivo de configuração relativo ao código
  const iniPath = path.join(__dirname, '../ACBrLib.ini');

  // Inicializa a biblioteca ACBrCEP com o arquivo .ini
  const iniResult = lib.CEP_Inicializar([iniPath, '']);
  if (iniResult.value !== 0) {
    throw new Error('Falha ao inicializar a biblioteca ACBrCEP');
  }

  // Busca o CEP usando a função da biblioteca
  const result = lib.CEP_BuscarPorCEP([cep, sResposta, esTamanho]);
  if (result.value !== 0) {
    // Captura detalhes do erro, se disponível
    const erroBuf = Buffer.alloc(buflength);
    const erroTam = buflength;
    lib.CEP_UltimoRetorno([erroBuf, erroTam]);
    lib.CEP_Finalizar(); // Finaliza a biblioteca após erro
    throw new Error(`Falha na busca do CEP: ${erroBuf.toString('utf8', 0, erroTam).trim() || 'Erro desconhecido (código: ' + result.value + ')'}`);
  }

  // Processa a resposta bem-sucedida
  const tamanhoResposta = esTamanho.readInt32LE(0); // Lê o tamanho ajustado pela biblioteca
  const resposta = sResposta.toString('utf8', 0, tamanhoResposta).trim(); // Converte o buffer em string
  lib.CEP_Finalizar(); // Finaliza a biblioteca após sucesso

  return JSON.parse(resposta); // Retorna a resposta como objeto JSON
}