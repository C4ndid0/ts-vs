import { define, open, DataType } from 'ffi-rs';
import * as fs from 'fs';

interface ACBrLib {
  CEP_Inicializar: (params: [string, string]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_Finalizar: () => { errnoCode: number; errnoMessage: string; value: number };
  CEP_BuscarPorCEP: (params: [string, Buffer, Buffer]) => { errnoCode: number; errnoMessage: string; value: number };
  CEP_UltimoRetorno: (params: [Buffer, Buffer]) => { errnoCode: number; errnoMessage: string; value: number };
}

const libPath = '/app/lib/linux/libacbrcep64.so';
open({ library: libPath, path: libPath });

const lib = define({
  CEP_Inicializar: { library: libPath, retType: DataType.I32, paramsType: [DataType.String, DataType.String], errno: true },
  CEP_Finalizar: { library: libPath, retType: DataType.I32, paramsType: [], errno: true },
  CEP_BuscarPorCEP: { library: libPath, retType: DataType.I32, paramsType: [DataType.String, DataType.U8Array, DataType.U8Array], errno: true },
  CEP_UltimoRetorno: { library: libPath, retType: DataType.I32, paramsType: [DataType.U8Array, DataType.U8Array], errno: true },
}) as unknown as ACBrLib;

async function testarCEP() {
  const buflength = 16384;
  const sResposta = Buffer.alloc(buflength);
  const esTamanho = Buffer.alloc(4);
  esTamanho.writeInt32LE(buflength, 0);

  const logPath = '/app/logs/acbr.log';
  fs.writeFileSync(logPath, 'Teste simples iniciado\n', { flag: 'a' });

  console.log('Inicializando...');
  const iniResult = lib.CEP_Inicializar(['/app/ACBrLib.ini', '']);
  console.log('Resultado:', iniResult);
  fs.appendFileSync(logPath, `Inicialização: ${JSON.stringify(iniResult)}\n`);

  if (iniResult.value === 0) {
    console.log('Buscando CEP 37200644...');
    const result = lib.CEP_BuscarPorCEP(['37200644', sResposta, esTamanho]);
    console.log('Resultado CEP_BuscarPorCEP:', result);
    fs.appendFileSync(logPath, `Resultado CEP_BuscarPorCEP: ${JSON.stringify(result)}\n`);

    if (result.value !== 0) {
      const erroBuf = Buffer.alloc(buflength);
      const erroTam = Buffer.alloc(4);
      erroTam.writeInt32LE(buflength, 0);
      const ultimoRetornoResult = lib.CEP_UltimoRetorno([erroBuf, erroTam]);
      console.log('Erro:', erroBuf.toString('utf8', 0, erroTam.readInt32LE(0)).trim());
      fs.appendFileSync(logPath, `Erro: ${erroBuf.toString('utf8', 0, erroTam.readInt32LE(0)).trim()}\n`);
    } else {
      const tamanhoResposta = esTamanho.readInt32LE(0);
      console.log('Resposta:', sResposta.toString('utf8', 0, tamanhoResposta));
      fs.appendFileSync(logPath, `Resposta: ${sResposta.toString('utf8', 0, tamanhoResposta)}\n`);
    }

    lib.CEP_Finalizar();
  }
}

testarCEP().catch(console.error);