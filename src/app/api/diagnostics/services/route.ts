import { NextRequest, NextResponse } from 'next/server';
import { getAllServices, createService } from '@/lib/diagnostics/db';
import { checkService } from '@/lib/diagnostics/checker';
import { ensurePollerRunning } from '@/lib/diagnostics/poller';
import { CheckType, ServiceCategory } from '@/lib/diagnostics/types';
import { parseHostPort } from '@/lib/diagnostics/tcpChecker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    ensurePollerRunning();
    const services = getAllServices();
    return NextResponse.json({ success: true, data: services });
  } catch (error: any) {
    console.error('Erro ao listar serviços:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao buscar serviços monitorados', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    ensurePollerRunning();
    const body = await request.json();
    const { name, url, check_type, category, host, port, interval_seconds, is_active } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'O nome do serviço é obrigatório.' },
        { status: 400 }
      );
    }

    const isTcp = category === 'service' || check_type === 'tcp';
    let finalUrl = '';
    let finalHost: string | null = null;
    let finalPort: number | null = null;
    let finalCheckType: CheckType = 'intelligent';
    const finalCategory: ServiceCategory = isTcp ? 'service' : 'application';

    if (isTcp) {
      finalCheckType = 'tcp';
      // Extrair host e porta a partir dos campos específicos ou de url (ex: "10.0.1.20:3306")
      if (host && port) {
        finalHost = String(host).trim();
        finalPort = Number(port);
      } else if (url && typeof url === 'string') {
        const parsed = parseHostPort(url.trim());
        if (parsed) {
          finalHost = parsed.host;
          finalPort = parsed.port;
        }
      }

      if (!finalHost) {
        return NextResponse.json(
          { success: false, error: 'O host/endereço de rede do serviço é obrigatório.' },
          { status: 400 }
        );
      }

      if (!finalPort || isNaN(finalPort) || finalPort <= 0 || finalPort > 65535) {
        return NextResponse.json(
          { success: false, error: 'A porta informada é inválida (deve estar entre 1 e 65535).' },
          { status: 400 }
        );
      }

      finalUrl = `${finalHost}:${finalPort}`;
    } else {
      // Aplicação Web / API (HTTP)
      if (!url || typeof url !== 'string' || !url.trim()) {
        return NextResponse.json(
          { success: false, error: 'A URL de checagem é obrigatória para aplicações web/API.' },
          { status: 400 }
        );
      }

      finalUrl = url.trim();
      try {
        new URL(finalUrl);
      } catch {
        return NextResponse.json(
          { success: false, error: 'A URL informada possui formato inválido. Utilize http:// ou https://' },
          { status: 400 }
        );
      }

      finalCheckType = check_type === 'basic' ? 'basic' : 'intelligent';
    }

    const interval = Number(interval_seconds) || 30;

    const newService = createService({
      name: name.trim(),
      url: finalUrl,
      check_type: finalCheckType,
      category: finalCategory,
      host: finalHost,
      port: finalPort,
      interval_seconds: Math.max(5, interval),
      is_active: is_active === undefined || is_active === 1 || is_active === true ? 1 : 0,
    });

    // If active, trigger initial check immediately so user sees feedback right away
    if (newService.is_active === 1) {
      checkService(newService).catch(err => {
        console.error('Erro no check inicial do novo serviço:', err);
      });
    }

    return NextResponse.json({ success: true, data: newService }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar serviço:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao cadastrar novo serviço', details: error.message },
      { status: 500 }
    );
  }
}
