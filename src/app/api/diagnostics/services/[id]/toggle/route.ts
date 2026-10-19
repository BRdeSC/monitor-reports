import { NextRequest, NextResponse } from 'next/server';
import { toggleServiceStatus } from '@/lib/diagnostics/db';
import { checkService } from '@/lib/diagnostics/checker';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const toggled = toggleServiceStatus(id);

    if (!toggled) {
      return NextResponse.json(
        { success: false, error: 'Serviço não encontrado' },
        { status: 404 }
      );
    }

    if (toggled.is_active === 1) {
      // Immediately run a probe when activated
      checkService(toggled).catch(console.error);
    }

    return NextResponse.json({ success: true, data: toggled });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao alternar status do serviço', details: error.message },
      { status: 500 }
    );
  }
}
