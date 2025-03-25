import { NextApiRequest, NextApiResponse } from 'next';

import { getHoldersClassification } from '@/lib/bsc/ankr';

export async function GET(
  request: Request,
  { params }: { params: { tokenAddress: string } },
) {
  const { tokenAddress } = params;
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit')) || 10;

  try {
    const result = await getHoldersClassification(tokenAddress, limit);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: 'Failed to classify token holders' },
      { status: 500 },
    );
  }
}
