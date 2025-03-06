import * as path from 'path';
import { define, open, DataType } from 'ffi-rs';

// Define the interface for ACBrLib functions
interface ACBrLib {
  CEP_Inicializar: (eArqConfig: string, eChaveCrypt: string) => number;
  CEP_Finalizar: () => number;
  CEP_BuscarPorCEP: (cep: string, sResposta: Buffer, esTamanho: Buffer) => number;
  CEP_UltimoRetorno: (sResposta: Buffer, esTamanho: Buffer) => number;
}

// Determine the library path based on the platform
const platform = process.platform;
const libPath = platform === 'win32'
  ? path.join(__dirname, '../lib/windows/ACBrCEP64.dll')
  : path.join(__dirname, '../lib/linux/libacbrcep64.so');

// Load the library into memory
open({ library: libPath, path: libPath });

// Define the ACBrLib functions using define with correct DataType values
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
    paramsType: [DataType.String, DataType.U8Array, DataType.U8Array],
    errno: true,
  },
  CEP_UltimoRetorno: {
    library: libPath,
    retType: DataType.I32,
    paramsType: [DataType.U8Array, DataType.U8Array],
    errno: true,
  },
}) as unknown as ACBrLib;

// Exported buscarCEP function
export async function buscarCEP(cep: string): Promise<any> {
  const buflength = 4024;
  const sResposta = Buffer.alloc(buflength);
  const esTamanho = Buffer.alloc(4);
  esTamanho.writeInt32LE(buflength, 0);

  const iniResult = lib.CEP_Inicializar('', '');
  if (iniResult !== 0) {
    const erroBuf = Buffer.alloc(buflength);
    const erroTam = Buffer.alloc(4);
    erroTam.writeInt32LE(buflength, 0);
    lib.CEP_UltimoRetorno(erroBuf, erroTam);
    throw new Error(`Failed to initialize: ${erroBuf.toString('utf8', 0, erroTam.readInt32LE(0)).trim()}`);
  }

  const result = lib.CEP_BuscarPorCEP(cep, sResposta, esTamanho);
  if (result !== 0) {
    const erroBuf = Buffer.alloc(buflength);
    const erroTam = Buffer.alloc(4);
    erroTam.writeInt32LE(buflength, 0);
    lib.CEP_UltimoRetorno(erroBuf, erroTam);
    lib.CEP_Finalizar();
    throw new Error(`CEP lookup failed: ${erroBuf.toString('utf8', 0, erroTam.readInt32LE(0)).trim()}`);
  }

  const resposta = sResposta.toString('utf8', 0, esTamanho.readInt32LE(0)).trim();
  lib.CEP_Finalizar();

  return JSON.parse(resposta); // Assuming the response is JSON
}