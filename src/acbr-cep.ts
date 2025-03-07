import { define, open, DataType } from 'ffi-rs';
import * as fs from 'fs';

interface ACBrLib {
  CEP_Inicializar: (params: [string, string]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_Finalizar: () => { errnoCode: number; errnoMessage: string; value: number };
  CEP_BuscarPorCEP: (params: [string, Buffer, number]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_UltimoRetorno: (params: [Buffer, number]) => { errnoCode: number; errnoMessage: string; value: number };
}

const libPath = '/app/lib/linux/libacbrcep64.so';
open({ library: libPath, path: libPath });

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
    paramsType: [DataType.String, DataType.U8Array, DataType.I32], // esTamanho como I32
    errno: true,
  },
  CEP_UltimoRetorno: {
    library: libPath,
    retType: DataType.I32,
    paramsType: [DataType.U8Array, DataType.I32], // esTamanho como I32
    errno: true,
  },
}) as unknown as ACBrLib;

export async function buscarCEP(cep: string): Promise<any> {
  const buflength = 16384;
  const sResposta = Buffer.alloc(buflength);

  const logPath = '/app/logs/acbr.log';
  fs.writeFileSync(logPath, 'Iniciando consulta de CEP\n', { flag: 'a' });

  console.log('Parâmetros para CEP_Inicializar:', ['/app/ACBrLib.ini', '']);
  const iniResult = lib.CEP_Inicializar(['/app/ACBrLib.ini', '']);
  console.log('Resultado de CEP_Inicializar:', iniResult);
  fs.appendFileSync(logPath, `Inicialização: ${JSON.stringify(iniResult)}\n`);

  if (iniResult.value !== 0) {
    const erroBuf = Buffer.alloc(buflength);
    const erroTam = buflength;
    console.log('Parâmetros para CEP_UltimoRetorno (init error):', [erroBuf, erroTam]);
    const ultimoRetornoResult = lib.CEP_UltimoRetorno([erroBuf, erroTam]);
    console.log('Resultado de CEP_UltimoRetorno:', ultimoRetornoResult);
    console.log('Mensagem de erro bruta:', erroBuf.toString('utf8', 0, erroTam).trim());
    throw new Error(`Failed to initialize: ${erroBuf.toString('utf8', 0, erroTam).trim()}`);
  }

  console.log('Parâmetros para CEP_BuscarPorCEP:', [cep, sResposta, buflength]);
  const result = lib.CEP_BuscarPorCEP([cep, sResposta, buflength]);
  console.log('Resultado de CEP_BuscarPorCEP:', result);
  fs.appendFileSync(logPath, `Resultado CEP_BuscarPorCEP: ${JSON.stringify(result)}\n`);

  if (result.value !== 0) {
    const erroBuf = Buffer.alloc(buflength);
    const erroTam = buflength;
    console.log('Parâmetros para CEP_UltimoRetorno (lookup error):', [erroBuf, erroTam]);
    const ultimoRetornoResult = lib.CEP_UltimoRetorno([erroBuf, erroTam]);
    console.log('Resultado de CEP_UltimoRetorno:', ultimoRetornoResult);
    console.log('Mensagem de erro bruta:', erroBuf.toString('utf8', 0, erroTam).trim());
    console.log('Chamando CEP_Finalizar após erro');
    lib.CEP_Finalizar();
    throw new Error(`CEP lookup failed: ${erroBuf.toString('utf8', 0, erroTam).trim()}`);
  }

  const tamanhoResposta = sResposta.indexOf(0) !== -1 ? sResposta.indexOf(0) : buflength;
  const resposta = sResposta.toString('utf8', 0, tamanhoResposta).trim();
  console.log('Resposta bruta:', resposta);
  console.log('Chamando CEP_Finalizar após sucesso');
  lib.CEP_Finalizar();

  return JSON.parse(resposta);
}