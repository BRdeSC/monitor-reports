import { GET as apiHealthGet } from '@/app/api/health/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  return apiHealthGet();
}
