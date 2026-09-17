import { NextRequest, NextResponse } from 'next/server';
import { getAllServices, createService } from '@/lib/diagnostics/db';
import { checkService } from '@/lib/diagnostics/checker';
import { ensurePollerRunning } from '@/lib/diagnostics/poller';
import { CheckType } from '@/lib/diagnostics/types';

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
    const { name, url, check_type, interval_seconds, is_active } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'O nome do serviço é obrigatório.' },
        { status: 400 }
      );
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { success: false, error: 'A URL de checagem é obrigatória.' },
        { status: 400 }
      );
    }

    // URL validation
    try {
      new URL(url.trim());
    } catch {
      return NextResponse.json(
        { success: false, error: 'A URL informada possui formato inválido. Utilize http:// ou https://' },
        { status: 400 }
      );
    }

    const validCheckType: CheckType = check_type === 'basic' ? 'basic' : 'intelligent';
    const interval = Number(interval_seconds) || 30;

    const newService = createService({
      name,
      url,
      check_type: validCheckType,
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
