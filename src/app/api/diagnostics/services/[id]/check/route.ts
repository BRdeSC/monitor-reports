import { NextRequest, NextResponse } from 'next/server';
import { getServiceById } from '@/lib/diagnostics/db';
import { checkService } from '@/lib/diagnostics/checker';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const service = getServiceById(id);

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado' },
        { status: 404 }
      );
    }

    const checkResult = await checkService(service);
    const updatedService = getServiceById(id);

    return NextResponse.json({
      success: true,
      result: checkResult,
      service: updatedService,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao executar verificação do serviço', details: error.message },
      { status: 500 }
    );
  }
}
