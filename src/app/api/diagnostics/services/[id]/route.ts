import { NextRequest, NextResponse } from 'next/server';
import { getServiceById, updateService, deleteService } from '@/lib/diagnostics/db';
import { checkService } from '@/lib/diagnostics/checker';
import { CheckType, ServiceCategory } from '@/lib/diagnostics/types';
import { parseHostPort } from '@/lib/diagnostics/tcpChecker';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const service = getServiceById(id);

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar serviço', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = getServiceById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado para atualização' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, url, check_type, category, host, port, interval_seconds, is_active } = body;

    const targetCategory: ServiceCategory = category !== undefined 
      ? category 
      : (check_type === 'tcp' ? 'service' : (existing.category || 'application'));
    const isTcp = targetCategory === 'service' || check_type === 'tcp';

    let finalUrl = url !== undefined ? url.trim() : existing.url;
    let finalHost: string | null = host !== undefined ? (host ? String(host).trim() : null) : (existing.host || null);
    let finalPort: number | null = port !== undefined ? (port ? Number(port) : null) : (existing.port || null);
    let validCheckType: CheckType | undefined = undefined;

    if (isTcp) {
      validCheckType = 'tcp';
      if (host && port) {
        finalHost = String(host).trim();
        finalPort = Number(port);
      } else if (url) {
        const parsed = parseHostPort(url.trim());
        if (parsed) {
          finalHost = parsed.host;
          finalPort = parsed.port;
        }
      }

      if (finalHost && finalPort) {
        finalUrl = `${finalHost}:${finalPort}`;
      }
    } else {
      if (check_type) {
        validCheckType = check_type === 'basic' ? 'basic' : 'intelligent';
      }

      if (url) {
        try {
          new URL(url.trim());
          finalUrl = url.trim();
        } catch {
          return NextResponse.json(
            { success: false, error: 'A URL informada possui formato inválido. Utilize http:// ou https://' },
            { status: 400 }
          );
        }
      }
    }

    const updated = updateService(id, {
      name,
      url: finalUrl,
      check_type: validCheckType,
      category: targetCategory,
      host: finalHost,
      port: finalPort,
      interval_seconds: interval_seconds ? Number(interval_seconds) : undefined,
      is_active: is_active !== undefined ? (is_active === 1 || is_active === true ? 1 : 0) : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado para atualização' },
        { status: 404 }
      );
    }

    // Trigger check if service is active
    if (updated.is_active === 1) {
      checkService(updated).catch(console.error);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar serviço', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = deleteService(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado para exclusão' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Serviço excluído com sucesso' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir serviço', details: error.message },
      { status: 500 }
    );
  }
}
