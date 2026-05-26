import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const userId = await getCurrentUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    const chatMessages = await prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: limit + 1,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
    });

    const hasMore = chatMessages.length > limit;
    const messages = hasMore ? chatMessages.slice(0, limit) : chatMessages;
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    return NextResponse.json({ messages, nextCursor });
}