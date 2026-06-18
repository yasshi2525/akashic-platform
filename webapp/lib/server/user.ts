"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@yasshi2525/persist-schema";
import { getAuth } from "./auth";

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,19}$/;
const RESERVED_HANDLES = new Set(["admin", "api", "live", "help", "support"]);

export type UserProfileFormState = {
    ok: boolean;
    submitted: boolean;
    message?: string;
    submittedAt?: number;
};

export type UserHandleFormState = {
    ok: boolean;
    submitted: boolean;
    handle?: string;
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

const initialHandleState: UserHandleFormState = {
    ok: true,
    submitted: false,
};

export async function updateUserHandleAction(
    prevState: UserHandleFormState,
    formData: FormData,
): Promise<UserHandleFormState> {
    const user = await getAuth();
    if (!user || user.authType !== "oauth") {
        return {
            ok: false,
            submitted: true,
            message: "ハンドルの設定にはサインインが必要です。",
            submittedAt: Date.now(),
        };
    }
    const raw = formData.get("handle")?.toString() ?? "";
    const handle = raw.toLowerCase().trim();
    if (!handle) {
        return {
            ok: false,
            submitted: true,
            message: "ハンドルを入力してください。",
            submittedAt: Date.now(),
        };
    }
    if (!HANDLE_PATTERN.test(handle)) {
        return {
            ok: false,
            submitted: true,
            message:
                "ハンドルは2〜20文字の英小文字・数字・アンダースコア・ハイフンで入力してください。先頭は英数字にしてください。",
            submittedAt: Date.now(),
        };
    }
    if (RESERVED_HANDLES.has(handle)) {
        return {
            ok: false,
            submitted: true,
            message: "このハンドルは使用できません。",
            submittedAt: Date.now(),
        };
    }
    try {
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                handle,
            },
        });
    } catch (err) {
        if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            err.code === "P2002"
        ) {
            return {
                ok: false,
                submitted: true,
                message: "このハンドルはすでに使用されています。",
                submittedAt: Date.now(),
            };
        }
        return {
            ok: false,
            submitted: true,
            message: "更新に失敗しました。",
            submittedAt: Date.now(),
        };
    }
    revalidatePath(`/user/${user.id}`);
    return {
        ...initialHandleState,
        submitted: true,
        handle,
        submittedAt: Date.now(),
    };
}
