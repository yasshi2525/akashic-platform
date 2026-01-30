"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@yasshi2525/persist-schema";
import { getAuth } from "./auth";

export type UserProfileFormState = {
    ok: boolean;
    submitted: boolean;
    message?: string;
    submittedAt?: number;
};

const initialState: UserProfileFormState = {
    ok: true,
    submitted: false,
};

export async function updateUserNameAction(
    prevState: UserProfileFormState,
    formData: FormData,
): Promise<UserProfileFormState> {
    const user = await getAuth();
    if (!user || user.authType !== "oauth") {
        return {
            ok: false,
            submitted: true,
            message: "ユーザー名の変更にはサインインが必要です。",
            submittedAt: Date.now(),
        };
    }
    const userId = formData.get("userId")?.toString();
    if (!userId || userId !== user.id) {
        return {
            ok: false,
            submitted: true,
            message: "ユーザー名の更新に失敗しました。",
            submittedAt: Date.now(),
        };
    }
    const name = formData.get("name")?.toString();
    if (!name) {
        return {
            ok: false,
            submitted: true,
            message: "ユーザー名を入力してください。",
            submittedAt: Date.now(),
        };
    }

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            name,
        },
    });

    revalidatePath(`/user/${user.id}`);
    return {
        ...initialState,
        submitted: true,
        submittedAt: Date.now(),
    };
}
