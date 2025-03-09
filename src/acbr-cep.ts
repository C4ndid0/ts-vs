import { open, define, load, DataType } from 'ffi-rs';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Interface para os símbolos (funções) exportados pela biblioteca ACBrCEP
 */
export interface ACBrCEPLib {
  CEP_Inicializar: (paramsValue: [string, string]) => { value: number; errnoCode: number; errnoMessage: string };
  CEP_Finalizar: (paramsValue: []) => { value: number; errnoCode: number; errnoMessage: string };
  CEP_Nome: (paramsValue: [Buffer, number]) => { value: number; errnoCode: number; errnoMessage: string };
  CEP_Versao: (paramsValue: [Buffer, number]) => { value: number; errnoCode: number; errnoMessage: string };
  CEP_UltimoRetorno: (paramsValue: [Buffer, number]) => { value: number; errnoCode: number; errnoMessage: string };
  CEP_BuscarPorCEP: (paramsValue: [string, Buffer, number]) => { value: number; errnoCode: number; errnoMessage: string };
}

/**
 * Classe para gerenciar a biblioteca ACBrCEP em diferentes plataformas
 */
export class ACBrLoader {
  private library: ACBrCEPLib | null = null;
  private libPath: string;
  private initialized: boolean = false;
  private configPath: string;
  private libName: string = 'acbr';

  constructor(libDir?: string, configPath?: string) {
    const platform = os.platform();
    const baseDir = libDir || path.join(process.cwd(), 'lib');
    
    if (platform === 'win32') {
      this.libPath = path.join(baseDir, 'windows', 'ACBrCEP64.dll');
    } else if (platform === 'linux') {
      this.libPath = path.join(baseDir, 'linux', 'libacbrcep64.so');
    } else {
      throw new Error(`Plataforma não suportada: ${platform}`);
    }

    if (!fs.existsSync(this.libPath)) {
      throw new Error(`Biblioteca não encontrada: ${this.libPath}`);
    }

    this.configPath = configPath || path.join(process.cwd(), 'ACBrLib.ini');
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    
    console.log(`Usando biblioteca: ${this.libPath}`);
    console.log(`Arquivo de configuração: ${this.configPath}`);
  }

  public load(): void {
    if (this.library) return;

    try {
      open({
        library: this.libName,
        path: this.libPath
      });

      this.library = define({
        CEP_Inicializar: {
          library: this.libName,
          retType: DataType.I32,
          paramsType: [DataType.String, DataType.String],
          errno: true
        },
        CEP_Finalizar: {
          library: this.libName,
          retType: DataType.I32,
          paramsType: [],
          errno: true
        },
        CEP_Nome: {
          library: this.libName,
          retType: DataType.I32,
          paramsType: [DataType.U8Array, DataType.I32],
          errno: true
        },
        CEP_Versao: {
          library: this.libName,
          retType: DataType.I32,
          paramsType: [DataType.U8Array, DataType.I32],
          errno: true
        },
        CEP_UltimoRetorno: {
          library: this.libName,
          retType: DataType.I32,
          paramsType: [DataType.U8Array, DataType.I32],
          errno: true
        },
        CEP_BuscarPorCEP: {
          library: this.libName,
          retType: DataType.I32,
          paramsType: [DataType.String, DataType.U8Array, DataType.I32],
          errno: true
        }
      }) as ACBrCEPLib;

      console.log('Biblioteca carregada com sucesso');
    } catch (error) {
      console.error('Erro ao carregar a biblioteca:', error);
      throw new Error(`Falha ao carregar a biblioteca: ${error}`);
    }
  }

  public initialize(): number {
    if (!this.library) {
      this.load();
    }

    if (!this.initialized && this.library) {
      console.log(`Inicializando a biblioteca com arquivo de configuração: ${this.configPath}`);
      console.log(`Parâmetros: ${JSON.stringify([this.configPath, ""])}`);
      console.log(`Config existe? ${fs.existsSync(this.configPath)}`);
      if (fs.existsSync(this.configPath)) {
        console.log(`Conteúdo do ACBrLib.ini: ${fs.readFileSync(this.configPath, 'utf8')}`);
      }

      try {
        // Teste com load para depuração
        const loadResult = load({
          library: this.libName,
          funcName: 'CEP_Inicializar',
          retType: DataType.I32,
          paramsType: [DataType.String, DataType.String],
          paramsValue: [this.configPath, ""],
          errno: true
        });
        console.log(`Resultado com load: ${JSON.stringify(loadResult)}`);

        // Chamada principal com define
        const result = this.library.CEP_Inicializar([this.configPath, ""]);
        console.log(`Resultado com define: ${JSON.stringify(result)}`);

        if (result.value >= 0) {
          this.initialized = true;
          
          const bufferSize = 1024;
          const nomeBuffer = Buffer.alloc(bufferSize);
          const versaoBuffer = Buffer.alloc(bufferSize);
          
          this.library.CEP_Nome([nomeBuffer, bufferSize]);
          this.library.CEP_Versao([versaoBuffer, bufferSize]);
          
          const nome = nomeBuffer.toString('utf8').replace(/\0/g, '');
          const versao = versaoBuffer.toString('utf8').replace(/\0/g, '');
          
          console.log(`Biblioteca inicializada: ${nome} - Versão: ${versao}`);
        } else {
          console.error(`Erro ao inicializar biblioteca: ${result.value}`);
          console.error(`Mensagem de erro: ${this.getUltimoRetorno()}`);
        }
        
        return result.value;
      } catch (error) {
        console.error(`Exceção ao chamar CEP_Inicializar: ${error}`);
        return -1;
      }
    }

    return 0;
  }

  public finalize(): number {
    if (this.initialized && this.library) {
      console.log('Finalizando biblioteca ACBrCEP');
      const result = this.library.CEP_Finalizar([]);
      
      if (result.value >= 0) {
        this.initialized = false;
        console.log('Biblioteca finalizada com sucesso');
      } else {
        console.error(`Erro ao finalizar biblioteca: ${result.value}`);
        console.error(`Mensagem de erro: ${this.getUltimoRetorno()}`);
      }
      
      return result.value;
    }
    return 0;
  }

  public buscarPorCEP(cep: string): any {
    const cepApenasNumeros = cep.replace(/\D/g, '');
    if (cepApenasNumeros.length !== 8) {
      return {
        success: false,
        error: {
          code: -1,
          message: 'CEP inválido. O CEP deve conter 8 dígitos numéricos.'
        }
      };
    }

    if (!this.initialized) {
      this.initialize();
    }

    if (!this.library) {
      throw new Error('Biblioteca não carregada');
    }

    console.log(`Iniciando busca do CEP: ${cepApenasNumeros}`);
    
    try {
      const bufferSize = 1024 * 10;
      const buffer = Buffer.alloc(bufferSize);
      
      const result = this.library.CEP_BuscarPorCEP([cepApenasNumeros, buffer, bufferSize]);
      console.log(`Resultado da busca: ${JSON.stringify(result)}`);
      
      if (result.value >= 0) {
        const responseStr = buffer.toString('utf8').replace(/\0/g, '');
        console.log(`Resposta recebida para CEP ${cepApenasNumeros}: ${responseStr}`);
        
        try {
          const data = JSON.parse(responseStr);
          return {
            success: true,
            data
          };
        } catch (e) {
          console.warn('Resposta não é um JSON válido:', responseStr);
          return {
            success: true,
            data: responseStr
          };
        }
      } else {
        const errorMessage = this.getUltimoRetorno();
        console.error(`Erro ao buscar CEP ${cepApenasNumeros}: ${result.value}. Mensagem: ${errorMessage}`);
        console.log(`Código de erro: ${result.errnoCode}, Mensagem de erro do sistema: ${result.errnoMessage}`);
        return {
          success: false,
          error: {
            code: result.value,
            message: errorMessage || 'Erro desconhecido'
          }
        };
      }
    } catch (error) {
      console.error('Exceção ao buscar CEP:', error);
      return {
        success: false,
        error: {
          code: -999,
          message: `Exceção: ${error}`
        }
      };
    }
  }

  public getUltimoRetorno(): string {
    if (!this.library) {
      throw new Error('Biblioteca não carregada');
    }

    const bufferSize = 1024 * 10;
    const buffer = Buffer.alloc(bufferSize);
    
    this.library.CEP_UltimoRetorno([buffer, bufferSize]);
    return buffer.toString('utf8').replace(/\0/g, '');
  }
}

export const acbrLib = new ACBrLoader();
export default ACBrLoader;