import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@yasshi2525/persist-schema";
import { GameInfo, GAMELIST_LIMITS } from "@/lib/types";

export async function GET(req: NextRequest) {
    const keyword = req.nextUrl.searchParams.get("keyword") ?? undefined;
    const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const limits = parseInt(
        req.nextUrl.searchParams.get("limits") ?? GAMELIST_LIMITS.toString(),
    );
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");

    const containsKeyword: Awaited<
        NonNullable<Parameters<typeof prisma.game.findMany>[0]>["where"]
    > = keyword
        ? {
              OR: [
                  {
                      title: {
                          contains: keyword,
                      },
                  },
                  {
                      description: {
                          contains: keyword,
                      },
                  },
              ],
          }
        : undefined;

    const filtersUserId: Awaited<
        NonNullable<Parameters<typeof prisma.game.findMany>[0]>["where"]
    > = userId
        ? {
              publisherId: userId,
          }
        : undefined;

    const where: Awaited<
        NonNullable<Parameters<typeof prisma.game.findMany>[0]>["where"]
    > =
        containsKeyword && filtersUserId
            ? {
                  AND: [containsKeyword, filtersUserId],
              }
            : containsKeyword
              ? containsKeyword
              : filtersUserId
                ? filtersUserId
                : undefined;

    const result = await prisma.game.findMany({
        take: limits,
        skip: page * limits,
        where,
        orderBy: {
            id: "desc",
        },
        select: {
            id: true,
            title: true,
            description: true,
            publisher: {
                select: {
                    id: true,
                    name: true,
                },
            },
            versions: {
                take: 1,
                select: {
                    id: true,
                    icon: true,
                    updatedAt: true,
                },
                orderBy: {
                    id: "desc",
                },
            },
            createdAt: true,
        },
    });
    return NextResponse.json({
        ok: true,
        data: result.map(
            ({ id, title, description, publisher, versions, createdAt }) => ({
                id,
                title,
                iconURL: `/content/${versions[0].id}/${versions[0].icon}`,
                publisher: {
                    id: publisher.id,
                    name: publisher.name!,
                },
                description,
                contentId: versions[0].id,
                createdAt,
                updatedAt: versions[0].updatedAt,
            }),
        ) satisfies GameInfo[],
    });
}
