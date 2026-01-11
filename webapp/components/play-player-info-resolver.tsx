"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import { ResolvingPlayerInfoRequest } from "@/lib/client/akashic-plugins/coe-limited-plugin";
import { useAuth } from "@/lib/client/useAuth";

export function PlayPlayerInfoResolver({
    request,
}: {
    request: ResolvingPlayerInfoRequest;
}) {
    const [user] = useAuth();
    const [remainingSeconds, setRemainingSeconds] = useState(
        request.limitSeconds,
    );
    const [open, setOpen] = useState(true);

    function handleDeny() {
        request.onResolve(false, request.guestName);
        setOpen(false);
    }

    function handleAccept() {
        request.onResolve(true, user?.name ?? request.guestName);
        setOpen(false);
    }

    useEffect(() => {
        const intervalId = setInterval(() => {
            setRemainingSeconds((current) => {
                const next = current - 1;
                if (next <= 0) {
                    clearInterval(intervalId);
                    handleDeny();
                    return 0;
                } else {
                    return next;
                }
            });
        }, 1000);
        return () => {
            clearInterval(intervalId);
        };
    }, []);

    return (
        <Dialog
            open={open}
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
        >
            <DialogTitle id="dialog-title">
                このゲームは名前を使用します
            </DialogTitle>
            {user ? (
                <DialogContent>
                    <DialogContentText id="dialog-description">
                        ユーザー名で参加するか、匿名で参加するか選択してください。(残り
                        {remainingSeconds}秒) ※未選択の場合は匿名で参加します。
                    </DialogContentText>
                    <DialogActions>
                        <Button
                            variant="contained"
                            onClick={handleAccept}
                            sx={{
                                textTransform: "none",
                            }}
                        >
                            ユーザー名 ({user.name})
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleDeny}
                            sx={{
                                textTransform: "none",
                            }}
                        >
                            匿名 ({request.guestName})
                        </Button>
                    </DialogActions>
                </DialogContent>
            ) : (
                <DialogContent>
                    <DialogContentText id="dialog-description">
                        匿名で参加します。 (残り
                        {remainingSeconds}秒)
                        ※サインインするとユーザー名で参加できます。
                    </DialogContentText>
                    <DialogActions>
                        <Button
                            variant="contained"
                            onClick={handleDeny}
                            sx={{
                                textTransform: "none",
                            }}
                        >
                            匿名 ({request.guestName})
                        </Button>
                    </DialogActions>
                </DialogContent>
            )}
        </Dialog>
    );
}
