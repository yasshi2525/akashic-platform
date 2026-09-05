"use client";

import { useState, useTransition } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from "@mui/material";
import {
    Block,
    Flag,
    MoreVert,
    VisibilityOff,
    Visibility,
} from "@mui/icons-material";
import { MuteTargetMessage, useMute } from "@/lib/client/useMute";
import { useAuth } from "@/lib/client/useAuth";
import { ReportSource } from "@/lib/types";
import { banFromChatAction, BanFormState } from "@/lib/server/ban-action";
import { ReportDialog } from "./report-dialog";

const initialBanState: BanFormState = { ok: true, submitted: false };

/** 部屋主がチャット発言者をBANする導線。GM 文脈のときだけ渡す。 */
export interface BanContext {
    playId: number;
    onDone?: () => void;
}

function BanConfirmDialog({
    open,
    onClose,
    playId,
    messageId,
    authorName,
    onDone,
}: {
    open: boolean;
    onClose: () => void;
    playId: number;
    messageId: number;
    authorName: string;
    onDone?: () => void;
}) {
    const [user] = useAuth();
    const [state, setState] = useState<BanFormState>(initialBanState);
    const [pending, startTransition] = useTransition();
    // サインイン部屋主は全部屋、ゲスト部屋主はこの部屋のみに効く
    const scopeNote =
        user?.authType === "oauth"
            ? "あなたが作成した部屋すべてに入室できなくなります。"
            : "この部屋に入室できなくなります。";

    const submit = () => {
        const fd = new FormData();
        fd.set("playId", `${playId}`);
        fd.set("messageId", `${messageId}`);
        startTransition(async () => {
            const next = await banFromChatAction(initialBanState, fd);
            setState(next);
            if (next.ok && next.submitted) {
                onDone?.();
                setTimeout(onClose, 1000);
            }
        });
    };

    const done = state.ok && state.submitted;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{authorName} さんをBAN</DialogTitle>
            <DialogContent>
                {done ? (
                    <Alert variant="outlined" severity="success">
                        BANしました。
                    </Alert>
                ) : (
                    <>
                        <DialogContentText variant="body2">
                            この発言者をBANします。{scopeNote}
                            未サインインの相手は再入室を完全には防げないため、
                            繰り返す場合はゲスト参加禁止の部屋をご利用ください。
                        </DialogContentText>
                        {!state.ok && state.submitted && (
                            <Alert
                                variant="outlined"
                                severity="warning"
                                sx={{ mt: 1 }}
                            >
                                {state.message}
                            </Alert>
                        )}
                    </>
                )}
            </DialogContent>
            {!done && (
                <DialogActions>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={onClose}
                        disabled={pending}
                    >
                        キャンセル
                    </Button>
                    <Button
                        onClick={submit}
                        variant="contained"
                        color="error"
                        disabled={pending}
                    >
                        BANする
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
}

export function MuteMenu({
    message,
    mute,
    source,
    banContext,
}: {
    message: MuteTargetMessage;
    mute: ReturnType<typeof useMute>;
    source: ReportSource;
    banContext?: BanContext;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [banOpen, setBanOpen] = useState(false);
    const muted = mute.isMuted(message);

    // 匿名キーも投稿者 ID も無い投稿 (削除済みユーザーなど) は対象にできない。
    // 自分の投稿はミュート・通報・BAN いずれも対象外なのでメニュー自体を出さない
    if (!message.author.anonKey || message.author.isSelf) {
        return null;
    }

    return (
        <>
            <IconButton
                size="small"
                aria-label="投稿の操作"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                disabled={mute.pending}
            >
                <MoreVert fontSize="inherit" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem
                    onClick={() => {
                        mute.toggle(message);
                        setAnchorEl(null);
                    }}
                >
                    <ListItemIcon>
                        {muted ? (
                            <Visibility fontSize="small" />
                        ) : (
                            <VisibilityOff fontSize="small" />
                        )}
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            muted
                                ? "この人のミュートを解除"
                                : "この人をミュート"
                        }
                        secondary={
                            mute.isPersisted
                                ? undefined
                                : "サインインすると他の端末にも引き継げます"
                        }
                    />
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        setReportOpen(true);
                        setAnchorEl(null);
                    }}
                >
                    <ListItemIcon>
                        <Flag fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary="この投稿を通報" />
                </MenuItem>
                {banContext && (
                    <MenuItem
                        onClick={() => {
                            setBanOpen(true);
                            setAnchorEl(null);
                        }}
                    >
                        <ListItemIcon>
                            <Block fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText primary="この人を部屋からBAN" />
                    </MenuItem>
                )}
            </Menu>
            <ReportDialog
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                target={{ kind: "message", source, messageId: message.id }}
                title="投稿を通報"
            />
            {banContext && (
                <BanConfirmDialog
                    open={banOpen}
                    onClose={() => setBanOpen(false)}
                    playId={banContext.playId}
                    messageId={message.id}
                    authorName={message.author.name}
                    onDone={banContext.onDone}
                />
            )}
        </>
    );
}
