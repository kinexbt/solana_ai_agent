import { NextRequest, NextResponse } from 'next/server';

import { verifyUser } from '@/server/actions/user';
import { dbGetConversations } from '@/server/db/queries';

export async function GET(req: NextRequest) {
  try {
    const session = await verifyUser();
    const userId = session?.data?.data?.id;
    console.log('conversation ID:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await dbGetConversations({ userId });
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
