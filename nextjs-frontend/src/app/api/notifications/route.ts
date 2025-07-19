import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

// Redis connection
async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = createClient({ url: redisUrl });
  await client.connect();
  return client;
}

// GET /api/notifications?address=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const client = await getRedisClient();

    try {
      // Get winner notifications for the address
      const pattern = `winner:${address.toLowerCase()}:*`;
      const keys = await client.keys(pattern);
      
      const notifications = [];
      
      for (const key of keys) {
        const data = await client.hGetAll(key);
        if (Object.keys(data).length > 0) {
          notifications.push({
            betId: data.betId,
            winnerAddress: data.winnerAddress,
            betCategory: data.betCategory,
            betDescription: data.betDescription,
            prizeAmount: data.prizeAmount,
            currencyType: parseInt(data.currencyType),
            settledAt: data.settledAt,
            txHash: data.txHash || undefined
          });
        }
      }

      // Get total count
      const countKey = `winner_count:${address.toLowerCase()}`;
      const count = await client.get(countKey);

      return NextResponse.json({
        notifications,
        count: count ? parseInt(count) : 0
      });

    } finally {
      await client.disconnect();
    }

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications?address=0x...&betId=123
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const betId = searchParams.get('betId');

    if (!address || !betId) {
      return NextResponse.json(
        { error: 'Address and betId parameters are required' },
        { status: 400 }
      );
    }

    const client = await getRedisClient();

    try {
      const key = `winner:${address.toLowerCase()}:${betId}`;
      const countKey = `winner_count:${address.toLowerCase()}`;
      
      const existed = await client.del(key);
      
      if (existed > 0) {
        // Decrement count
        const currentCount = await client.get(countKey);
        if (currentCount && parseInt(currentCount) > 0) {
          await client.decr(countKey);
        }
      }

      return NextResponse.json({
        success: true,
        removed: existed > 0
      });

    } finally {
      await client.disconnect();
    }

  } catch (error) {
    console.error('Error removing notification:', error);
    return NextResponse.json(
      { error: 'Failed to remove notification' },
      { status: 500 }
    );
  }
} 