import { define, open, DataType } from 'ffi-rs';
import * as path from 'path';

const libPath = path.join(__dirname, '../lib/linux/libacbrcep64.so');
open({ library: libPath, path: libPath });

interface ACBrLib {
  CEP_Inicializar: (params: [string, string]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_Finalizar: () => { errnoCode: number; errnoMessage: string; value: number };
  CEP_BuscarPorCEP: (params: [string, Buffer, Buffer]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_UltimoRetorno: (params: [Buffer, number]) => { errnoCode: number; errnoMessage: string; value: number };
}

const lib = define({
  CEP_Inicializar: {
    library: libPath,
    retType: DataType.I32,
    paramsType: [DataType.String, DataType.String],
    errno: true,
  },
  CEP_Finalizar: {
    library: libPath,
    retType: DataType.I32,
    paramsType: [],
    errno: true,
  },
  CEP_BuscarPorCEP: {
    library: libPath,
    retType: DataType.I32,
    paramsType: [DataType.String, DataType.U8Array, DataType.U8Array], // Buffer para esTamanho
    errno: true,
  },
  CEP_UltimoRetorno: {
    library: libPath,
    retType: DataType.I32,
    paramsType: [DataType.U8Array, DataType.I32],
    errno: true,
  },
}) as unknown as ACBrLib;

export async function buscarCEP(cep: string): Promise<any> {
  const buflength = 16384;
  const sResposta = Buffer.alloc(buflength);
  const esTamanho = Buffer.alloc(4); // Buffer de 4 bytes para inteiro (mutável)
  esTamanho.writeInt32LE(buflength, 0); // Inicializa com o tamanho máximo

  const iniPath = path.join(process.cwd(), 'ACBrLib.ini');
  console.log('Parâmetros para CEP_Inicializar:', [iniPath, '']);
  const iniResult = lib.CEP_Inicializar([iniPath, '']);
  console.log('Resultado de CEP_Inicializar:', iniResult);

  if (iniResult.value !== 0) {
    const erroBuf = Buffer.alloc(buflength);
    const erroTam = buflength;
    console.log('Parâmetros para CEP_UltimoRetorno (init error):', [erroBuf, erroTam]);
    const ultimoRetornoResult = lib.CEP_UltimoRetorno([erroBuf, erroTam]);
    console.log('Resultado de CEP_UltimoRetorno:', ultimoRetornoResult);
    console.log('Mensagem de erro bruta:', erroBuf.toString('utf8', 0, erroTam).trim());
    throw new Error(`Failed to initialize: ${erroBuf.toString('utf8', 0, erroTam).trim()}`);
  }

  console.log('Parâmetros para CEP_BuscarPorCEP:', [cep, sResposta, esTamanho]);
  const result = lib.CEP_BuscarPorCEP([cep, sResposta, esTamanho]);
  console.log('Resultado de CEP_BuscarPorCEP:', result);

  if (result.value !== 0) {
    const erroBuf = Buffer.alloc(buflength);
    const erroTam = buflength;
    console.log('Parâmetros para CEP_UltimoRetorno (lookup error):', [erroBuf, erroTam]);
    const ultimoRetornoResult = lib.CEP_UltimoRetorno([erroBuf, erroTam]);
    console.log('Resultado de CEP_UltimoRetorno:', ultimoRetornoResult);
    console.log('Mensagem de erro bruta:', erroBuf.toString('utf8', 0, erroTam).trim());
    console.log('Chamando CEP_Finalizar após erro');
    lib.CEP_Finalizar();
    throw new Error(`CEP lookup failed: ${erroBuf.toString('utf8', 0, erroTam).trim() || 'Erro desconhecido (value: ' + result.value + ')'}`);
  }

  const tamanhoResposta = esTamanho.readInt32LE(0); // Lê o tamanho ajustado pela DLL
  const resposta = sResposta.toString('utf8', 0, tamanhoResposta).trim();
  console.log('Tamanho da resposta:', tamanhoResposta);
  console.log('Resposta bruta:', resposta);
  console.log('Chamando CEP_Finalizar após sucesso');
  lib.CEP_Finalizar();

  return JSON.parse(resposta);
}