import net from 'net';

export interface TcpCheckResult {
  is_up: boolean;
  latencyMs: number;
  errorReason: string | null;
  payloadJson: string;
}

/**
 * Utilitário para extrair host e porta de strings de endereço
 * Exemplos aceitos: "10.0.1.20:3306", "mysql.cptec.inpe.br:3306", "tcp://localhost:6379", "redis:6379"
 */
export function parseHostPort(address: string, defaultPort?: number): { host: string; port: number } | null {
  if (!address || typeof address !== 'string') return null;
  
  // Remove protocolos se presentes
  const clean = address.replace(/^(tcp:\/\/|http:\/\/|https:\/\/)/i, '').trim();
  const lastColon = clean.lastIndexOf(':');
  
  if (lastColon === -1) {
    if (defaultPort && defaultPort > 0 && defaultPort <= 65535) {
      return { host: clean, port: defaultPort };
    }
    return null;
  }

  const host = clean.slice(0, lastColon).replace(/^\[|\]$/g, '').trim();
  const port = parseInt(clean.slice(lastColon + 1), 10);

  if (!host || isNaN(port) || port <= 0 || port > 65535) {
    return null;
  }

  return { host, port };
}

/**
 * Checagem direta de porta via Socket TCP nativo do Node.js
 * Utiliza encerramento gracioso via socket.end() para evitar abortos de conexão e recusa (ECONNREFUSED)
 * 
 * @param host Endereço ou IP do serviço de infraestrutura
 * @param port Porta TCP de escuta (ex: 3306, 5432, 6379)
 * @param timeoutMs Tempo limite de conexão em milissegundos (padrão: 3000ms)
 */
export function checkTcpPort(
  host: string,
  port: number | string,
  timeoutMs: number = 3000
): Promise<TcpCheckResult> {
  // Garante que a porta seja sempre tratada estritamente como número inteiro válido
  const numericPort = typeof port === 'number' ? Math.floor(port) : parseInt(String(port).trim(), 10);

  if (isNaN(numericPort) || numericPort <= 0 || numericPort > 65535) {
    return Promise.resolve({
      is_up: false,
      latencyMs: 0,
      errorReason: `Porta TCP inválida: "${port}". Deve ser um número entre 1 e 65535.`,
      payloadJson: JSON.stringify({
        protocol: 'tcp',
        host,
        port,
        is_up: false,
        error: 'Porta inválida',
        timestamp: new Date().toISOString(),
      }),
    });
  }

  return new Promise((resolve) => {
    const start = performance.now();
    const socket = new net.Socket();
    let isHandled = false;
    let closeTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    };

    const finish = (is_up: boolean, errorReason: string | null, errorCode?: string) => {
      if (isHandled) return;
      isHandled = true;
      cleanup();

      const latencyMs = Math.round((performance.now() - start) * 10) / 10;

      const payload = {
        protocol: 'tcp',
        host,
        port: numericPort,
        latency_ms: latencyMs,
        is_up,
        error: errorReason,
        code: errorCode || null,
        timestamp: new Date().toISOString(),
      };

      resolve({
        is_up,
        latencyMs,
        errorReason,
        payloadJson: JSON.stringify(payload),
      });
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      // Sucesso na conexão: calcula latência e resolve
      finish(true, null);

      // Encerramento gracioso (FIN/ACK) para que o servidor finalize limpo
      try {
        socket.end();
      } catch {
        try {
          socket.destroy();
        } catch {}
      }

      // Timer de segurança: força destroy caso o servidor não responda ao FIN em 1 segundo
      closeTimer = setTimeout(() => {
        try {
          socket.destroy();
        } catch {}
      }, 1000);
    });

    socket.on('timeout', () => {
      // Em caso de timeout, destrói o socket de forma segura
      try {
        socket.destroy();
      } catch {}

      finish(
        false,
        `Tempo limite esgotado (${timeoutMs}ms): O serviço em ${host}:${numericPort} não respondeu no tempo esperado.`,
        'ETIMEDOUT'
      );
    });

    socket.on('error', (err: any) => {
      // Em caso de erro de rede, destrói o socket de forma segura
      try {
        socket.destroy();
      } catch {}

      let reason = `Falha de rede TCP: ${err.message || 'Erro de comunicação com o socket'}`;

      if (err.code === 'ECONNREFUSED') {
        reason = `Conexão recusada (ECONNREFUSED): O serviço na porta ${numericPort} não está aceitando conexões em ${host}.`;
      } else if (err.code === 'ENOTFOUND') {
        reason = `Host não encontrado (ENOTFOUND): O endereço DNS "${host}" não pôde ser resolvido.`;
      } else if (err.code === 'ETIMEDOUT') {
        reason = `Tempo limite esgotado (ETIMEDOUT): Conexão expirou ao contatar ${host}:${numericPort}.`;
      } else if (err.code === 'EHOSTUNREACH') {
        reason = `Host inalcançável (EHOSTUNREACH): Não há rota até ${host}.`;
      } else if (err.code === 'ENETUNREACH') {
        reason = `Rede inalcançável (ENETUNREACH): Rede indisponível para alcançar ${host}.`;
      }

      finish(false, reason, err.code);
    });

    socket.on('close', () => {
      cleanup();
    });

    try {
      socket.connect(numericPort, host);
    } catch (err: any) {
      try {
        socket.destroy();
      } catch {}
      finish(false, `Falha ao abrir socket TCP: ${err.message || 'Erro inesperado'}`, err.code);
    }
  });
}
