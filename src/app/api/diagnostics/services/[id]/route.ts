import { NextRequest, NextResponse } from 'next/server';
import { getServiceById, updateService, deleteService } from '@/lib/diagnostics/db';
import { checkService } from '@/lib/diagnostics/checker';
import { CheckType } from '@/lib/diagnostics/types';

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
    const body = await request.json();
    const { name, url, check_type, interval_seconds, is_active } = body;

    if (url) {
      try {
        new URL(url.trim());
      } catch {
        return NextResponse.json(
          { success: false, error: 'A URL informada possui formato inválido.' },
          { status: 400 }
        );
      }
    }

    const validCheckType: CheckType | undefined = check_type
      ? (check_type === 'basic' ? 'basic' : 'intelligent')
      : undefined;

    const updated = updateService(id, {
      name,
      url,
      check_type: validCheckType,
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
