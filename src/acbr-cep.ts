import { define, open, DataType, createPointer, restorePointer, JsExternal } from 'ffi-rs';
import * as path from 'path';

// Define o caminho da biblioteca com base no sistema operacional
const libPath = process.platform === 'win32'
  ? path.join(__dirname, '../lib/windows/ACBrCEP64.dll') // Windows
  : path.join(__dirname, '../lib/linux/libacbrcep64.so'); // Linux

// Abre a biblioteca nativa
open({ library: 'ACBrCEP', path: libPath });

// Interface que define as funções da biblioteca ACBrCEP
interface ACBrLib {
  CEP_Inicializar: (params: [string, string]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_Finalizar: () => { errnoCode: number; errnoMessage: string; value: number };
  CEP_BuscarPorCEP: (params: [string, JsExternal, JsExternal]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_UltimoRetorno: (params: [JsExternal, number]) => { errnoCode: number; errnoMessage: string; value: number };
}

// Configura as funções da biblioteca usando ffi-rs
const lib = define({
  CEP_Inicializar: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [DataType.String, DataType.String], errno: true },
  CEP_Finalizar: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [], errno: true },
  CEP_BuscarPorCEP: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [DataType.String, DataType.External, DataType.External], errno: true },
  CEP_UltimoRetorno: { library: 'ACBrCEP', retType: DataType.I32, paramsType: [DataType.External, DataType.I32], errno: true },
}) as unknown as ACBrLib;

// Inicializa a biblioteca uma vez no carregamento do módulo
const iniPath = path.join(__dirname, '../ACBrLib.ini');
console.log('Inicializando a biblioteca no carregamento do módulo com .ini:', iniPath);
const iniResult = lib.CEP_Inicializar([iniPath, '']);
if (iniResult.value !== 0) {
  throw new Error('Falha ao inicializar a biblioteca ACBrCEP no carregamento do módulo');
}

// Função principal para buscar informações de um CEP
export async function buscarCEP(cep: string): Promise<any> {
  console.log('Iniciando busca do CEP:', cep);
  if (!cep || typeof cep !== 'string' || cep.trim().length !== 8) {
    throw new Error('CEP inválido. Forneça um CEP de 8 dígitos.');
  }

  const buflength = 16384;
  const sResposta = Buffer.alloc(buflength);
  const esTamanho = Buffer.alloc(4);
  esTamanho.writeInt32LE(buflength, 0);

  // Cria ponteiros nativos para os buffers
  const [sRespostaPtr] = createPointer({
    paramsType: [DataType.U8Array],
    paramsValue: [sResposta],
  });
  const [esTamanhoPtr] = createPointer({
    paramsType: [DataType.U8Array],
    paramsValue: [esTamanho],
  });

  console.log('Chamando CEP_BuscarPorCEP com CEP:', cep);
  const result = lib.CEP_BuscarPorCEP([cep, sRespostaPtr, esTamanhoPtr]);
  console.log('Resultado CEP_BuscarPorCEP:', result);

  if (result.value !== 0) {
    const erroBuf = Buffer.alloc(buflength);
    const [erroBufPtr] = createPointer({
      paramsType: [DataType.U8Array],
      paramsValue: [erroBuf],
    });
    console.log('Chamando CEP_UltimoRetorno');
    lib.CEP_UltimoRetorno([erroBufPtr, buflength]);
    const [erroBufResult] = restorePointer({ retType: [DataType.U8Array], paramsValue: [erroBufPtr] }) as Buffer[];
    throw new Error(`Falha na busca do CEP: ${erroBufResult.toString('utf8', 0, buflength).trim() || 'Erro desconhecido (código: ' + result.value + ')'}`);
  }

  // Recupera os valores dos ponteiros
  const [sRespostaResult] = restorePointer({ retType: [DataType.U8Array], paramsValue: [sRespostaPtr] }) as Buffer[];
  const [esTamanhoResult] = restorePointer({ retType: [DataType.U8Array], paramsValue: [esTamanhoPtr] }) as Buffer[];

  const tamanhoResposta = esTamanhoResult.readInt32LE(0);
  const resposta = sRespostaResult.toString('utf8', 0, tamanhoResposta).trim();
  console.log('Resposta recebida:', resposta);

  return JSON.parse(resposta);
}

// Finaliza a biblioteca ao encerrar o processo
process.on('exit', () => {
  console.log('Finalizando a biblioteca ao encerrar o processo');
  lib.CEP_Finalizar();
});