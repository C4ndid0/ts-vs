import * as path from 'path';
import * as ffi from 'ffi-napi';
import * as ref from 'ref-napi';

// Definir tipos para as funções nativas da ACBrLib
interface ACBrLib {
  CEP_Inicializar: (eArqConfig: string, eChaveCrypt: string) => number;
  CEP_Finalizar: () => number;
  CEP_BuscarPorCEP: (cep: string, sResposta: Buffer, esTamanho: ref.Pointer<number>) => number;
  CEP_UltimoRetorno: (sResposta: Buffer, esTamanho: ref.Pointer<number>) => number;
  CEP_ConfigLerValor: (secao: string, chave: string, valor: Buffer, tamanho: ref.Pointer<number>) => number;
}

const platform = process.platform;
const libPath = platform === 'win32'
  ? path.join(__dirname, '../lib/windows/ACBrCEP64.dll')
  : path.join(__dirname, '../lib/linux/libacbrcep64.so');

const eArqConfig = path.join(__dirname, '../ACBrLib.ini');
const eChaveCrypt = '';

const tint = ref.types.int;
const tchar = ref.types.CString;

const lib: ACBrLib = ffi.Library(libPath, {
  CEP_Inicializar: ['int', ['string', 'string']],
  CEP_Finalizar: ['int', []],
  CEP_BuscarPorCEP: ['int', ['string', 'pointer', 'pointer']],
  CEP_UltimoRetorno: ['int', ['pointer', 'pointer']],
  CEP_ConfigLerValor: ['int', ['string', 'string', 'pointer', 'pointer']],
});

const acbr = {
  buscarCEP: (cep: string): string => {
    const buflength = 4024;
    const sResposta = Buffer.alloc(buflength);
    const esTamanho = ref.alloc(tint, buflength);

    console.log('Inicializando ACBrLib...');
    const iniResult = lib.CEP_Inicializar(eArqConfig, eChaveCrypt);
    if (iniResult !== 0) {
      const erroBuffer = Buffer.alloc(buflength);
      const erroTamanho = ref.alloc(tint, buflength);
      lib.CEP_UltimoRetorno(erroBuffer, erroTamanho);
      throw new Error(`Failed to initialize ACBr CEP: ${erroBuffer.toString('utf8').trim()}`);
    }
    console.log('ACBrLib inicializado com sucesso');

    const configBuffer = Buffer.alloc(buflength);
    const configTamanho = ref.alloc(tint, buflength);
    const configResult = lib.CEP_ConfigLerValor('CEP', 'WebService', configBuffer, configTamanho);
    if (configResult === 0) {
      console.log(`WebService configurado: ${configBuffer.toString('utf8', 0, configTamanho.deref()).trim()}`);
    } else {
      console.log('Erro ao ler configuração do WebService');
    }

    console.log(`Buscando CEP: ${cep}...`);
    const result = lib.CEP_BuscarPorCEP(cep, sResposta, esTamanho);
    console.log(`Resultado da busca: ${result}`);
    if (result !== 0) {
      const erroBuffer = Buffer.alloc(buflength);
      const erroTamanho = ref.alloc(tint, buflength);
      lib.CEP_UltimoRetorno(erroBuffer, erroTamanho);
      lib.CEP_Finalizar();
      throw new Error(`CEP lookup failed: ${erroBuffer.toString('utf8').trim()}`);
    }

    console.log('Finalizando ACBrLib...');
    lib.CEP_Finalizar();
    console.log('ACBrLib finalizado');
    return sResposta.toString('utf8', 0, esTamanho.deref()).trim();
  },
};

export async function buscarCEP(cep: string): Promise<any> {
  try {
    const resposta = acbr.buscarCEP(cep);
    return JSON.parse(resposta);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}